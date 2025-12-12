require('dotenv').config();
const app = require('./src/app.js')
const PORT = process.env.SERVER_PORT
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});