const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadFolder = path.join(__dirname, '../../public/temp')

// Ensure upload directory exists (SYNC – required by multer)
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureDirectoryExists(uploadFolder)
        cb(null, uploadFolder)
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        const uniqueSuffix = Date.now() + '-' + Math.floor(Math.random() * 1e9)
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
    },
})

// Allow images only
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (extname && mimetype) {
        return cb(null, true)
    }

    const error = new Error('Only image files (jpg, jpeg, png) are allowed')
    error.status = 415 // Unsupported Media Type
    cb(error)
}

const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
    },
    fileFilter,
})

module.exports = upload
