const { pool } = require("../config/db");
const { errorGenerator } = require("../utils/errorGenarator");

const validators = {
    isGeneralText: (val) => /^[a-zA-Z\s]{3,50}$/.test(val?.trim()),
    isCnic: (val) => /^[0-9]{5}-[0-9]{7}-[0-9]$/.test(val),
    isPhone: (val) => /^03[0-9]{9}$/.test(val),
    isVillage: (val) => /^[a-zA-Z\s]{3,20}$/.test(val?.trim()),

    locationData: {
        swat: ['matta', 'khwazakhela', 'bahrain', 'kabal', 'barikot', 'babuzai', 'charbagh'],
        lower_dir: ['timergara', 'samar_bag', 'lal_qila', 'adenzai', 'balambat', 'khal', 'munda'],
        upper_dir: ['dir', 'wari', 'shiringal'],
        chitral: ['chitral', 'mastuj', 'torkhow'],
        malakand: ['batkhela', 'dargai'],
        buner: ['daggar', 'gagra', 'khudu_khel', 'chagharzai', 'gadezai', 'mandanr', 'chamla'],
        shangla: ['alar', 'bisham', 'chakesar', 'martung', 'puran'],
        central_dir: ['akhagram_karo', 'larjam', 'nehag_dara', 'shaib_abad', 'wari'],
        bajaur: ['khar_bajaur', 'bar_chamerkand', 'barang', 'loe_mamund', 'wara_mamund', 'nawagai', 'salarzai', 'utmankhel_bajaur'],
        lower_chitral: ['chitral', 'darosh'],
        upper_chitral: ['mastuj']
    },

    isValidLocation: (district, tehsil) => {
        const d = district?.toLowerCase().trim();
        const t = tehsil?.toLowerCase().trim();
        console.log(d, t);

        return validators.locationData[d]?.includes(t) ?? false;
    }
};

const updatePersonalInfo = async (req, client) => { // Removed res, next as they aren't used here
    const data = req.personalData;

    if (!data) throw errorGenerator('Personal Information payload is missing', 400);

    // Validation checks
    if (!validators.isGeneralText(data.name)) throw errorGenerator('Invalid Name', 400);
    if (!validators.isGeneralText(data.father_name)) throw errorGenerator('Invalid Father Name', 400);
    if (!validators.isCnic(data.cnic)) throw errorGenerator('Invalid CNIC format', 400);
    if (!validators.isPhone(data.phone_number)) throw errorGenerator('Invalid Phone number', 400);
    if (!validators.isGeneralText(data.muhalla)) throw errorGenerator('Invalid Muhalla', 400);
    if (!validators.isVillage(data.village)) throw errorGenerator('Invalid Village', 400);

    if (!validators.isValidLocation(data.district, data.tehsil)) {
        throw errorGenerator('Invalid District or Tehsil combination', 400);
    }

    const userId = parseInt(data.reported_by);
    if (isNaN(userId)) throw errorGenerator('Invalid User ID', 400);

    try {

        const updateQuery = `
            UPDATE USERS 
            SET NAME = $1, FATHER_NAME = $2, CNIC = $3, PHONE_NUMBER = $4, 
                MUHALLA = $5, VILLAGE = $6, DISTRICT = $7, TEHSIL = $8, 
                UPDATED_AT = NOW() 
            WHERE USER_ID = $9
            RETURNING USER_ID;
        `;

        const values = [
            data.name.trim(), data.father_name.trim(), data.cnic, data.phone_number,
            data.muhalla.trim(), data.village.trim(), data.district.toLowerCase().trim(),
            data.tehsil.toLowerCase().trim(), userId
        ];

        const result = await client.query(updateQuery, values);

        if (result.rowCount === 0) {
            throw errorGenerator('User not found', 404);
        }

        req.status.push('Updated personal information successfully');

    } catch (error) {

        // FIX: If it's one of our generated errors (400, 404), re-throw it.
        // If it's a random DB crash, throw the 500.
        if (error.statusCode) throw error;

        console.error("Database Error:", error);
        throw errorGenerator('Failed to update personal information', 500);
    }
};

module.exports = { updatePersonalInfo };


/*
    const { query, pool } = require("../config/db")
    const { errorGenerator } = require("./errorGenarator")

    const isNameFatherNameMuhallaFormated = (val) => {
        const regex = /^[a-zA-Z\s]{3,50}$/
        return regex.test(val.trim())
    }
    const isCnicFormated = (val) => {
        const regix = /^[0-9]{5}-[0-9]{7}-[0-9]$/
        return regix.test(val)
    }
    const isPhoneNumberFormated = (val) => {
        const regex = /^03[0-9]{9}$/
        return regex.test(val)
    }
    const isVillageFormated = (val) => {
        const regex = /^[a-zA-Z]{3,20}$/
        return regex.test(val.trim())
    }
    const validateDistrict = (val) => {
        const validDistricts = ['swat', 'buner', 'chatral', 'upper_dir', 'lower_dir', 'shangla', 'malakand']
        return validDistricts.includes(val.toLowerCase())
    }
    const validateTehsil = (district, tehsil) => {
        const locationData = {
            'swat': ['matta', 'khwazakhela', 'bahrain', 'kabal', 'barikot', 'babuzai', 'charbagh'],
            'lower_dir': ['timergara', 'samar_bag', 'lal_qila', 'maidan'],
            'upper_dir': ['dir', 'wari', 'shiringal'],
            'chitral': ['chitral', 'mastuj', 'torkhow'],
            'malakand': ['batkhela', 'dargai'],
            'buner': ['daggar', 'gagra', 'khudu_khel'],
            'shangla': ['alar', 'bisham', 'chakesar', 'martung', 'puran']
        };

        const d = district.toLowerCase().trim()
        const t = tehsil.toLowerCase().trim();
        if (!locationData[d]) return false;
        return locationData[d].includes(t);
    }
    const updatePersonalInfo = async (req, res, next) => {
        if (!req.personalData) throw next(errorGenerator('Personal Information payload is missing', 400));

        if (!req.personalData.name || !isNameFatherNameMuhallaFormated(req.personalData.name)) throw next(errorGenerator('Name cannot be null or invalid', 400));

        if (!req.personalData.father_name || !isNameFatherNameMuhallaFormated(req.personalData.father_name)) throw next(errorGenerator('Father name cannot be null or invalid', 400));

        if (!req.personalData.cnic || !isCnicFormated(req.personalData.cnic)) throw next(errorGenerator('CNIC cannot be null or invalid', 400));

        if (!req.personalData.phone_number || !isPhoneNumberFormated(req.personalData.phone_number)) throw next(errorGenerator('Phone number cannot be null or invalid', 400));

        if (!req.personalData.muhalla || !isNameFatherNameMuhallaFormated(req.personalData.muhalla)) throw next(errorGenerator('Muhalla cannot be null on invalid', 400));

        if (!req.personalData.village || !isVillageFormated(req.personalData.village)) throw next(errorGenerator('Village cannot be null on invalid', 400));

        if (!req.personalData.district || !validateDistrict(req.personalData.district)) {
            console.log(validateDistrict(req.personalData.district), req.personalData.district.toLowerCase().trim(), req.personalData.tehsil.toLowerCase().trim());

            throw next(errorGenerator('District cannot be null on invalid', 400));
        }

        if (!req.personalData.tehsil || !validateTehsil(req.personalData.district, req.personalData.tehsil)) {
            console.log(validateDistrict(req.personalData.district), req.personalData.district.toLowerCase().trim(), req.personalData.tehsil.toLowerCase().trim());

            throw next(errorGenerator('Tehsil cannot be null or invalid', 400));
        }

        if (!parseInt(req.personalData.reported_by)) throw next(errorGenerator('Tehsil cannot be null or invalid', 400));

        const { name, father_name, cnic, phone_number, muhalla, village, district, tehsil, reported_by } = req.personalData
        let client = null;
        const errors = [];
        try {
            client = await pool.connect();
            await client.query('BEGIN');
            const userExists = await client.query('SELECT USER_ID, EMAIL FROM USERS WHERE USER_ID = $1', [reported_by])
            if (userExists.rowCount === 0) errors.push('User not found');
            const response = await client.query('UPDATE USERS SET NAME = $1, FATHER_NAME = $2, CNIC = $3, PHONE_NUMBER = $4, MUHALLA = $5, VILLAGE = $6, DISTRICT = $7, TEHSIL = $8, UPDATED_AT = NOW() where user_id = $9;', [name, father_name, cnic, phone_number, muhalla, village, district, tehsil, reported_by])
            req.status.push('Updated personal information of the affected person')

            if (errors.length) {
                await client.query('ROLLBACK');
                if (client) {
                    client.release()
                }
                throw next(errorGenerator('User not found. Check the ID in your request body', 404))
            }
            await client.query('COMMIT');

        } catch (error) {
            console.log(error);
            await client.query('ROLLBACK');
            throw next(errorGenerator('Something went wrong while updating the personal information', 400))
        }
        finally {
            if (client) {
                client.release()
            }
        }
    }
    module.exports = { updatePersonalInfo }
*/