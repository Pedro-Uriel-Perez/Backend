"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.options('*', (0, cors_1.default)());
app.use((0, cors_1.default)({
    origin: ['https://appointmentsmedical.netlify.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
let pool;
async function initializePool() {
    pool = await (0, database_1.getConnection)();
}
initializePool();
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend funcionando correctamentee' });
});
// Ruta de registro
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, apePaterno, apeMaterno, correo, contrase, edad, tipoSangre, genero } = req.body;
        console.log('Datos de registro recibidos:', { nombre, apePaterno, apeMaterno, correo, edad, tipoSangre, genero });
        // Validación de campos obligatorios
        if (!nombre || !apePaterno || !apeMaterno || !correo || !contrase || !tipoSangre || !genero) {
            console.log('Error: Campos incompletos');
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        // Validación de formato de correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(correo)) {
            console.log('Error: Formato de correo inválido');
            return res.status(400).json({ error: 'Formato de correo electrónico inválido' });
        }
        // Verificar si el correo ya está registrado
        console.log('Verificando si el correo ya existe...');
        const [existingUsers] = await pool.execute('SELECT id FROM usuarios WHERE correo = ?', [correo]);
        if (existingUsers.length > 0) {
            console.log('Error: Correo ya registrado');
            return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
        }
        console.log('Hasheando contraseña...');
        const hashedPassword = await bcrypt_1.default.hash(contrase, 10);
        // Preparar la consulta SQL y los valores
        let sql = 'INSERT INTO usuarios (nombre, apePaterno, apeMaterno, correo, contrase';
        const values = [nombre, apePaterno, apeMaterno, correo, hashedPassword];
        // Añadir campos opcionales si están presentes
        if (edad !== undefined) {
            sql += ', edad';
            values.push(edad);
        }
        if (tipoSangre !== undefined) {
            sql += ', tipoSangre';
            values.push(tipoSangre);
        }
        if (genero !== undefined) {
            sql += ', genero';
            values.push(genero);
        }
        sql += ') VALUES (' + '?,'.repeat(values.length).slice(0, -1) + ')';
        console.log('Ejecutando consulta SQL:', sql);
        console.log('Valores:', values);
        // Insertar nuevo usuario
        const [result] = await pool.execute(sql, values);
        if (result.insertId) {
            console.log('Usuario registrado exitosamente:', result.insertId);
            return res.status(201).json({
                message: 'Usuario registrado exitosamente',
                id: result.insertId,
                usuario: { nombre, apePaterno, apeMaterno, correo, edad, tipoSangre, genero }
            });
        }
        else {
            throw new Error('No se pudo insertar el usuario');
        }
    }
    catch (error) {
        console.error('Error detallado en el registro:', error);
        if (error instanceof Error) {
            console.error('Mensaje de error:', error.message);
            console.error('Stack trace:', error.stack);
        }
        if (error instanceof Error && 'code' in error) {
            const mysqlError = error;
            switch (mysqlError.code) {
                case 'ER_DUP_ENTRY':
                    return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
                case 'ER_ACCESS_DENIED_ERROR':
                    console.error('Error de acceso a la base de datos');
                    break;
                default:
                    console.error('Código de error MySQL:', mysqlError.code);
            }
        }
        return res.status(500).json({
            error: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Ruta para obtener todos los usuarios o un usuario específico
app.get('/api/usuarios/:id?', async (req, res) => {
    try {
        const { id } = req.params;
        if (id) {
            // Obtener un usuario específico por ID
            const [rows] = await pool.execute('SELECT id, nombre, apePaterno, apeMaterno, correo FROM usuarios WHERE id = ?', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            return res.json(rows[0]);
        }
        else {
            // Obtener todos los usuarios
            const [rows] = await pool.execute('SELECT id, nombre, apePaterno, apeMaterno, correo FROM usuarios');
            console.log('Usuarios obtenidos:', rows.length);
            return res.json(rows);
        }
    }
    catch (error) {
        console.error('Error al obtener usuario(s):', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta de login
app.post('/api/login', async (req, res) => {
    try {
        const { correo, contrase } = req.body;
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (rows.length > 0) {
            const user = rows[0];
            const isMatch = await bcrypt_1.default.compare(contrase, user.contrase);
            await pool.execute('INSERT INTO login_attempts (usuario_id, exitoso) VALUES (?, ?)', [user.id, isMatch]);
            if (isMatch) {
                res.json({
                    isAuthenticated: true,
                    userId: user.id.toString(),
                    userName: user.nombre
                });
            }
            else {
                res.json({ isAuthenticated: false });
            }
        }
        else {
            await pool.execute('INSERT INTO login_attempts (usuario_id, exitoso) VALUES (?, ?)', [null, false]);
            res.json({ isAuthenticated: false });
        }
    }
    catch (error) {
        console.error('Error en la autenticación:', error);
        res.status(500).json({ error: 'Error en la autenticación' });
    }
});
// Ruta para registrar una nueva cita
app.post('/api/citas', async (req, res) => {
    try {
        const { IdMedico, idPaciente, nombrePaciente, descripcion, fecha, hora } = req.body;
        const [result] = await pool.execute('INSERT INTO citas (IdMedico, idPaciente, nombrePaciente, descripcion, fecha, hora) VALUES (?, ?, ?, ?, ?, ?)', [IdMedico, idPaciente, nombrePaciente, descripcion, fecha, hora]);
        if (result.insertId) {
            console.log('Cita registrada exitosamente:', result);
            return res.status(201).json({ message: 'Cita registrada exitosamente', id: result.insertId });
        }
        else {
            console.error('Error al registrar cita:', result);
            return res.status(500).json({ error: 'Error al registrar cita' });
        }
    }
    catch (error) {
        console.error('Error al registrar cita:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta para obtener las citas de un paciente
app.get('/api/citas/:idPaciente', async (req, res) => {
    try {
        const [rows] = await pool.execute(`SELECT c.*, m.nombre as nombreMedico, m.especialidad, m.hospital, m.telefono as telefonoMedico, m.correo as correoMedico 
       FROM citas c 
       LEFT JOIN medicos m ON c.IdMedico = m.id 
       WHERE c.idPaciente = ? 
       ORDER BY c.fecha DESC, c.hora DESC`, [req.params.idPaciente]);
        console.log('Citas encontradas:', rows);
        res.json(rows);
    }
    catch (error) {
        console.error('Error al obtener citas:', error);
        res.status(500).json({ error: 'Error al obtener citas' });
    }
});
// Ruta para obtener una cita específica por su ID
app.get('/api/citas/idcita/:idCita', async (req, res) => {
    try {
        const idCita = req.params.idCita;
        const [rows] = await pool.execute(`SELECT c.*, m.nombre as nombreMedico, m.especialidad, m.hospital, m.telefono as telefonoMedico, m.correo as correoMedico
       FROM citas c 
       LEFT JOIN medicos m ON c.IdMedico = m.id 
       LEFT JOIN usuarios p ON c.idPaciente = p.id
       WHERE c.idcita = ?`, [idCita]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        return res.json(rows[0]);
    }
    catch (error) {
        console.error('Error al obtener la cita:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta de prueba para obtener citas
app.get('/api/test-citas/:idPaciente', async (req, res) => {
    try {
        const idPaciente = req.params.idPaciente;
        const [rows] = await pool.execute('SELECT * FROM citas WHERE idPaciente = ?', [idPaciente]);
        res.json({
            message: 'Consulta de prueba',
            idPaciente: idPaciente,
            citasCount: rows.length,
            citas: rows
        });
    }
    catch (error) {
        console.error('Error en la consulta de prueba:', error);
        res.status(500).json({ error: 'Error en la consulta de prueba' });
    }
});
// Ruta para modificar una cita existente
app.put('/api/citas/:idCita', async (req, res) => {
    try {
        const idCita = req.params.idCita;
        const { fecha, hora, nombrePaciente, descripcion } = req.body;
        console.log('Actualizando cita:', { idCita, fecha, hora, nombrePaciente, descripcion }); // Log para depuración
        const [result] = await pool.execute('UPDATE citas SET fecha = ?, hora = ?, nombrePaciente = ?,descripcion = ? WHERE idcita = ?', [fecha, hora, nombrePaciente, descripcion, idCita]);
        if (result.affectedRows > 0) {
            console.log('Cita actualizada exitosamente');
            res.json({ message: 'Cita actualizada exitosamente' });
        }
        else {
            console.log('Cita no encontrada');
            res.status(404).json({ error: 'Cita no encontrada' });
        }
    }
    catch (error) {
        console.error('Error al actualizar la cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta para cancelar (eliminar) una cita
app.delete('/api/citas/:idCita', async (req, res) => {
    try {
        const idCita = req.params.idCita;
        const [result] = await pool.execute('DELETE FROM citas WHERE idcita = ?', [idCita]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Cita cancelada exitosamente' });
        }
        else {
            res.status(404).json({ error: 'Cita no encontrada' });
        }
    }
    catch (error) {
        console.error('Error al cancelar la cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
//Ruta para unicio de sesion de medixos
// ...
app.post('/api/medico-login', async (req, res) => {
    try {
        const { correo, id } = req.body;
        const [rows] = await pool.execute('SELECT * FROM medicos WHERE correo = ? AND id = ?', [correo, id]);
        if (rows.length > 0) {
            const medico = rows[0];
            res.json({
                isAuthenticated: true,
                medicoId: medico.id,
                medicoNombre: medico.nombre,
                medicoApellido: medico.apellido,
                especialidad: medico.especialidad,
                hospital: medico.hospital
            });
        }
        else {
            res.json({ isAuthenticated: false });
        }
    }
    catch (error) {
        console.error('Error en la autenticación del médico:', error);
        res.status(500).json({ error: 'Error en la autenticación' });
    }
});
// Ruta para obtener las citas del médico
app.get('/api/citas-medico/:medicoId', async (req, res) => {
    try {
        const medicoId = req.params.medicoId;
        const [rows] = await pool.execute(`
      SELECT c.*, 
             u.nombre, u.apePaterno, u.apeMaterno, u.edad, u.tipoSangre, u.genero,
             DATE_FORMAT(c.fecha, '%d/%m/%Y') as fechaFormateada,
             TIME_FORMAT(c.hora, '%H:%i') as horaFormateada
      FROM citas c 
      JOIN usuarios u ON c.idPaciente = u.id 
      WHERE c.IdMedico = ? 
      ORDER BY c.fecha ASC, c.hora ASC`, [medicoId]);
        console.log('Datos crudos de citas:', rows);
        const citasFormateadas = rows.map(cita => ({
            idcita: cita.idcita,
            IdMedico: cita.IdMedico,
            idPaciente: cita.idPaciente.toString(),
            nombrePaciente: `${cita.nombre || ''} ${cita.apePaterno || ''} ${cita.apeMaterno || ''}`.trim(),
            descripcion: cita.descripcion,
            fecha: cita.fecha,
            hora: cita.hora,
            estado: cita.estado,
            fechaFormateada: cita.fechaFormateada,
            horaFormateada: cita.horaFormateada,
            paciente: {
                id: cita.idPaciente,
                nombre: `${cita.nombre || ''} ${cita.apePaterno || ''} ${cita.apeMaterno || ''}`.trim(),
                edad: cita.edad,
                tipoSangre: cita.tipoSangre,
                genero: cita.genero
            },
            esPasada: new Date(cita.fecha) < new Date(),
            tieneHistorial: cita.estado === 'finalizada',
            puedeModificar: cita.estado === 'pendiente',
            estaFinalizada: cita.estado === 'finalizada'
        }));
        console.log('Citas formateadas:', citasFormateadas);
        res.json(citasFormateadas);
    }
    catch (error) {
        console.error('Error al obtener citas del médico:', error);
        res.status(500).json({ error: 'Error al obtener citas del médico' });
    }
});
// Confirmar cita porr parte del medicoo
app.put('/api/citas/:idCita/confirmar', async (req, res) => {
    try {
        const idCita = req.params.idCita;
        const [result] = await pool.execute('UPDATE citas SET estado = "confirmada" WHERE idcita = ?', [idCita]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Cita confirmada exitosamente' });
        }
        else {
            res.status(404).json({ error: 'Cita no encontrada' });
        }
    }
    catch (error) {
        console.error('Error al confirmar la cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
//Guardar, cambiando a cancelada solamnete
app.put('/api/citas/:idCita/cancelar', async (req, res) => {
    try {
        const idCita = req.params.idCita;
        const [result] = await pool.execute('UPDATE citas SET estado = "cancelada" WHERE idcita = ?', [idCita]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Cita cancelada exitosamente' });
        }
        else {
            res.status(404).json({ error: 'Cita no encontrada' });
        }
    }
    catch (error) {
        console.error('Error al cancelar la cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Finalizar cita y agregar historial médico
app.post('/api/citas/:idCita/finalizar', async (req, res) => {
    try {
        const idCita = req.params.idCita;
        const { diagnostico, tratamiento, observaciones } = req.body;
        console.log('Datos recibidos:', { idCita, diagnostico, tratamiento, observaciones });
        // Actualizar estado de la cita
        await pool.execute('UPDATE citas SET estado = "finalizada" WHERE idcita = ?', [idCita]);
        // Obtener información de la cita
        const [citaRows] = await pool.execute('SELECT c.*, u.edad, u.tipoSangre FROM citas c JOIN usuarios u ON c.idPaciente = u.id WHERE c.idcita = ?', [idCita]);
        if (citaRows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        const cita = citaRows[0];
        // Insertar historial médico
        await pool.execute(`
      INSERT INTO historial_medico 
      (id_paciente, id_medico, id_cita, fecha, diagnostico, tratamiento, observaciones, edad_paciente, tipo_sangre_paciente)
      VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)`, [
            cita.idPaciente,
            cita.IdMedico,
            idCita,
            diagnostico || null,
            tratamiento || null,
            observaciones || null,
            cita.edad || null,
            cita.tipoSangre || null
        ]);
        res.json({ message: 'Cita finalizada y historial médico registrado' });
    }
    catch (error) {
        console.error('Error al finalizar la cita:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Obtener historial médico de un paciente
app.get('/api/historial-medico/:idPaciente', async (req, res) => {
    try {
        const idPaciente = req.params.idPaciente;
        console.log('Solicitando historial médico para el paciente:', idPaciente);
        const [rows] = await pool.execute(`
      SELECT hm.*, 
             c.fecha as fecha_cita, c.hora as hora_cita,
             m.nombre as nombreMedico, m.apellido as apellidoMedico, m.especialidad,
             u.nombre as nombrePaciente, u.apePaterno, u.apeMaterno, 
             COALESCE(hm.edad_paciente, u.edad) as edad_paciente,
             COALESCE(hm.tipo_sangre_paciente, u.tipoSangre) as tipo_sangre_paciente
      FROM historial_medico hm
      JOIN citas c ON hm.id_cita = c.idcita
      JOIN medicos m ON hm.id_medico = m.id
      JOIN usuarios u ON hm.id_paciente = u.id
      WHERE hm.id_paciente = ?
      ORDER BY c.fecha DESC, c.hora DESC`, [idPaciente]);
        console.log('Registros encontrados:', rows.length);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No se encontró historial médico para este paciente' });
        }
        const historialFormateado = rows.map(registro => ({
            ...registro,
            nombreMedicoCompleto: `${registro.nombreMedico || ''} ${registro.apellidoMedico || ''}`.trim(),
            nombrePacienteCompleto: `${registro.nombrePaciente || ''} ${registro.apePaterno || ''} ${registro.apeMaterno || ''}`.trim(),
            fechaFormateada: new Date(registro.fecha_cita).toLocaleDateString(),
            horaFormateada: new Date(`2000-01-01T${registro.hora_cita}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        console.log('Historial formateado:', historialFormateado);
        res.json(historialFormateado);
    }
    catch (error) {
        console.error('Error al obtener el historial médico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Modificar historial médico
app.put('/api/historial-medico/:idRegistro', async (req, res) => {
    try {
        const idRegistro = req.params.idRegistro;
        const { diagnostico, tratamiento, observaciones } = req.body;
        console.log('Actualizando registro con ID:', idRegistro);
        const [result] = await pool.execute(`
      UPDATE historial_medico 
      SET diagnostico = ?, tratamiento = ?, observaciones = ? 
      WHERE id = ?`, [diagnostico, tratamiento, observaciones, idRegistro]);
        // Verificar si se actualizó algún registro
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No se encontró el registro para actualizar' });
        }
        res.json({ message: 'Registro actualizado correctamente' });
    }
    catch (error) {
        console.error('Error al actualizar el historial médico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Eliminar registro del historial médico
app.delete('/api/historial-medico/:idRegistro', async (req, res) => {
    try {
        const idRegistro = req.params.idRegistro;
        console.log('Eliminando registro con ID:', idRegistro);
        const [result] = await pool.execute(`
      DELETE FROM historial_medico WHERE id = ?`, [idRegistro]);
        // Verificar si se eliminó algún registro
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No se encontró el registro para eliminar' });
        }
        res.json({ message: 'Registro eliminado correctamente' });
    }
    catch (error) {
        console.error('Error al eliminar el historial médico:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta para procesar y guardar el pago
app.post('/api/registrar-pagos', async (req, res) => {
    try {
        const { numeroTarjeta, nombreTitular, fechaExpiracion, codigoSeguridad, monto, idHospital } = req.body;
        // Validar datos del pago
        if (!numeroTarjeta || !nombreTitular || !fechaExpiracion || !codigoSeguridad || !monto || !idHospital) {
            return res.status(400).json({ error: 'Datos de pago incompletos' });
        }
        const fechaPago = new Date().toISOString();
        const [result] = await pool.execute('INSERT INTO pagos (numeroTarjeta, nombreTitular, fechaExpiracion, codigoSeguridad, monto, fechaPago, idHospital) VALUES (?, ?, ?, ?, ?, ?, ?)', [numeroTarjeta, nombreTitular, fechaExpiracion, codigoSeguridad, monto, fechaPago, idHospital]);
        if (result.insertId) {
            return res.status(201).json({ message: 'Pago registrado exitosamente', idPago: result.insertId });
        }
        else {
            return res.status(500).json({ error: 'Error al registrar el pago' });
        }
    }
    catch (error) {
        console.error('Error al procesar el pago:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta para obtener todos los pagos
app.get('/api/pagos', async (_req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM pagos');
        if (rows.length > 0) {
            return res.status(200).json(rows);
        }
        else {
            return res.status(404).json({ message: 'No se encontraron pagos' });
        }
    }
    catch (error) {
        console.error('Error al obtener los pagos:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta para obtener un pago por su ID
app.get('/api/pagos/:idPago', async (req, res) => {
    try {
        const { idPago } = req.params;
        const [rows] = await pool.execute('SELECT * FROM pagos WHERE idPago = ?', [idPago]);
        if (rows.length > 0) {
            return res.status(200).json(rows[0]);
        }
        else {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }
    }
    catch (error) {
        console.error('Error al obtener el pago:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta para actualizar un pago por su ID
app.put('/api/pagos/:idPago', async (req, res) => {
    try {
        const { idPago } = req.params;
        const { numeroTarjeta, nombreTitular, fechaExpiracion, codigoSeguridad, monto } = req.body;
        // Validar datos del pago
        if (!numeroTarjeta || !nombreTitular || !fechaExpiracion || !codigoSeguridad || !monto) {
            return res.status(400).json({ error: 'Datos de pago incompletos' });
        }
        const [result] = await pool.execute('UPDATE pagos SET numeroTarjeta = ?, nombreTitular = ?, fechaExpiracion = ?, codigoSeguridad = ?, monto = ? WHERE idPago = ?', [numeroTarjeta, nombreTitular, fechaExpiracion, codigoSeguridad, monto, idPago]);
        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Pago actualizado exitosamente' });
        }
        else {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }
    }
    catch (error) {
        console.error('Error al actualizar el pago:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Ruta para eliminar un pago por su ID
app.delete('/api/pagos/:idPago', async (req, res) => {
    try {
        const { idPago } = req.params;
        const [result] = await pool.execute('DELETE FROM pagos WHERE idPago = ?', [idPago]);
        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Pago eliminado exitosamente' });
        }
        else {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }
    }
    catch (error) {
        console.error('Error al eliminar el pago:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
//------------------------------------------
// Rutas para hospitales
app.post('/api/registrar-hospital', async (req, res) => {
    try {
        const { nombreHospital, direccion, estado, municipio, numSucursal, telefono, nomRepresHospital, rfcHospital, monto } = req.body;
        if (!nombreHospital || !direccion || !estado || !municipio ||
            !numSucursal || !telefono || !nomRepresHospital ||
            !rfcHospital || monto === undefined) {
            return res.status(400).json({ error: 'Datos del hospital incompletos' });
        }
        const [result] = await pool.query('INSERT INTO hospital (nombreHospital, direccion, estado, municipio, numSucursal, telefono, nomRepresHospital, rfcHospital, monto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [nombreHospital, direccion, estado, municipio, numSucursal, telefono, nomRepresHospital, rfcHospital, monto]);
        if (result.insertId) {
            return res.status(201).json({
                message: 'Hospital registrado exitosamente',
                idHospital: result.insertId
            });
        }
        else {
            return res.status(500).json({ error: 'Error al registrar el hospital' });
        }
    }
    catch (error) {
        console.error('Error al procesar el registro del hospital:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Obtener un hospital por ID
app.get('/api/hospital/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM hospital WHERE idHospital = ?', [id]);
        if (rows.length > 0) {
            return res.json(rows[0]);
        }
        else {
            return res.status(404).json({ error: 'Hospital no encontrado' });
        }
    }
    catch (error) {
        console.error('Error al obtener el hospital:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Actualizar un hospital por ID
app.put('/api/hospital/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombreHospital, direccion, estado, municipio, numSucursal, telefono, nomRepresHospital, rfcHospital, monto } = req.body;
        if (!nombreHospital || !direccion || !estado || !municipio || !numSucursal || !telefono || !nomRepresHospital || !rfcHospital || !monto) {
            return res.status(400).json({ error: 'Datos incompletos para actualizar el hospital' });
        }
        const [result] = await pool.query(`UPDATE hospital SET nombreHospital = ?, direccion = ?, estado = ?, municipio = ?, numSucursal = ?, telefono = ?, nomRepresHospital = ?, rfcHospital = ?, monto = ? WHERE idHospital = ?`, [nombreHospital, direccion, estado, municipio, numSucursal, telefono, nomRepresHospital, rfcHospital, monto, id]);
        if (result.affectedRows > 0) {
            return res.json({ message: 'Hospital actualizado exitosamente' });
        }
        else {
            return res.status(404).json({ error: 'Hospital no encontrado' });
        }
    }
    catch (error) {
        console.error('Error al actualizar el hospital:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// Eliminar un hospital por ID
app.delete('/api/hospital/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM hospital WHERE idHospital = ?', [id]);
        if (result.affectedRows > 0) {
            return res.json({ message: 'Hospital eliminado exitosamente' });
        }
        else {
            return res.status(404).json({ error: 'Hospital no encontrado' });
        }
    }
    catch (error) {
        console.error('Error al eliminar el hospital:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.get('/api/hospital', async (_req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM hospital');
        if (rows.length > 0) {
            return res.status(200).json(rows);
        }
        else {
            return res.status(404).json({ message: 'No se encontraron hospitales' });
        }
    }
    catch (error) {
        console.error('Error al obtener los pagos:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
}
app.get('/', (req, res) => {
    res.send('API de Citas Médicas funcionando correctamente');
});
exports.default = app;
//# sourceMappingURL=server.js.map