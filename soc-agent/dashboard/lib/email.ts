import nodemailer from 'nodemailer';

interface SmtpSettings {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
}

export const createTransporter = (settings: SmtpSettings) => {
    return nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure, // true for 465, false for other ports
        auth: {
            user: settings.user,
            pass: settings.password,
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certs for internal SMTP
        }
    });
};

export const sendEmail = async (settings: SmtpSettings, to: string, subject: string, html: string) => {
    try {
        const transporter = createTransporter(settings);

        const info = await transporter.sendMail({
            from: settings.from,
            to,
            subject,
            html,
        });

        console.log(`Email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};
