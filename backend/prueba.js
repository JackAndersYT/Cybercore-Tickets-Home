const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = '123456'; // tu contraseña
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log(hash);
}

generateHash();