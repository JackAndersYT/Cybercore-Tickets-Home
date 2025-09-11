import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Asegurar que existe la carpeta uploads
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
    // Dónde se guardarán los archivos
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    // Cómo se nombrará cada archivo
    filename: function (req, file, cb) {
        // Genera un nombre único para evitar colisiones: ticketId-timestamp-nombreoriginal
        const ticketId = req.params.id;
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, `ticket-${ticketId}-${uniqueSuffix}${fileExtension}`);
    }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
    // Acepta imágenes, PDFs y algunos documentos
    const allowedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de archivo no soportado: ${file.mimetype}. Solo se permiten imágenes, PDFs y documentos de texto.`), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 10 // Límite de 10 MB por archivo
    }
});

export default upload;