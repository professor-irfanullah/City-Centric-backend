const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// 1. Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a local file to Cloudinary and deletes the local copy.
 * @param {string} localFilePath - Path from req.file.path
 * @param {string} destinationFolder - 'home_damage' or 'shop_damage'
 */
const uploadOnCloudinary = async (localFilePath, destinationFolder) => {
    try {
        if (!localFilePath) return null;

        // 2. Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            folder: destinationFolder,
            resource_type: "auto",
        });

        // 3. Success: Remove the local file from /public/temp
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        // 4. Failure: Still remove local file to keep storage clean
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.error("Cloudinary upload failed:", error.message);
        return null;
    }
};
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            console.log(`Successfully deleted image: ${publicId}`);
        } else {
            console.warn(`Failed to delete image: ${publicId}`, result);
        }

        return result;
    } catch (error) {
        console.error("Cloudinary deletion failed:", error.message);
        // Don't throw - we don't want deletion failures to crash the main process
        return null;
    }
};

module.exports = { uploadOnCloudinary, deleteFromCloudinary };
