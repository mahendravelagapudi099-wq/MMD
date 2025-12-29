import emailjs from '@emailjs/browser';

/**
 * Sends a certificate notification email to the student.
 * Uses EmailJS (configured with a Gmail service).
 */
export const sendCertificateEmail = async (certData) => {
    // These keys should ideally be in a .env file
    // For now, I'm providing the structure. Replace these with your actual keys.
    const SERVICE_ID = "service_rjzfijv";
    const TEMPLATE_ID = "template_dtqa5nj";
    const PUBLIC_KEY = "9alo0GdGy75EUyPAJ";

    if (SERVICE_ID === "YOUR_SERVICE_ID") {
        console.warn("EmailJS Keys not configured. Email not sent.");
        return;
    }

    const templateParams = {
        studentName: certData.studentName,
        courseName: certData.courseName,
        certId: certData.certId,
        verifyLink: `${window.location.origin}/verify/${certData.certId}`,
        studentEmail: certData.email,
        institutionName: certData.institutionName
    };

    try {
        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('Email sent successfully!', response.status, response.text);
        return response;
    } catch (err) {
        console.error('Failed to send email:', err);
        throw err;
    }
};
