const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
})

async function sendEmail(from, to, subject, text, html){
    return await transporter.sendMail({ from : from, to : to, subject : subject, text : text, html : html });
}

function getVerificationEmailHTML(firstName, hostUrl, token){
    return  `   
                <h3>
                    Hi ${firstName}, welcome to WeTalk. To maintain user authenticity onto our platform, we would
                    like you to verify your mail
                </h3>
                <p>Please click on this link - <a href="${hostUrl}/api/v1/user/verify/${token}">Verification link</a></p>
                <h4>This link will expire in 2 hours.</p>
            `
}

function getPasswordResetEmailHTML(url, token){
    return  `   
                <h3>
                    Hello there. Seems like you are having some trouble accessing your account. Don't worry we have got
                    you covered. Please click on the link below to reset your existing account password.
                </h3>
                <p><a href="${url}?token=${token}">Password reset link</a></p>
                <h4>This link will expire in 1 hour.</p>
            `
}

module.exports = { sendEmail, getVerificationEmailHTML, getPasswordResetEmailHTML };