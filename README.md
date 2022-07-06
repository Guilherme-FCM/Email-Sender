<h1 align="center">Email-Sender 📧</h1>
<p align="center">📨 Node.js API to send e-mails</p>

<p align="center">
    <a href="#about">About</a> |
    <a href="#installations">Installations</a> |
    <a href="#how-to-use">How to Use</a> | 
    <a href="#documentation">Documentation</a> | 
    <a href="#technologies">Technologies</a> | 
    <a href="#license">License</a>
</p>

## 😁**About**
This service is capable to send emails very simply. You just have to enter the sender email, recipient email, subject and the message that you want to sent. Let's email everyone!

## 👨‍💻**Installations**
To use this API, you will need install [Node and NPM](https://nodejs.org/en/download/) in your computer.

## 🚀**How to Use**
1. Create a account in [Mailtrap](https://mailtrap.io/). This is our email sandbox service for development environment.

2. Add a inbox for this project.

3. In your inbox, select the option "Nodemailer" and copy your mailtrap configuration.

4. Paste your settings in [config/mail.json](./config/mail.json)

5. Execute the commands below in project directory to use this API in your computer:
~~~bash
# Install dependencies
npm install;

# Run project in development mode
npm run dev;

# Runing in http://localhost:3333/
~~~

## 📄**Documentation**
Use the post route `/send-email` to send emails through this API. In the request body, enter the attributes `from`, `to` (string or array), `subject` (optional), `message`, `text` (optiona), for exemple:
~~~json
{
    "from": "guifcm12@gmail.com",
    "to": [
        "person1@example.com", 
        "person2@example.com"
    ],
    "subject": "Email-Sender Project",
    "message": "<h1>Welcome to my email sending service.</h1>",
    "text": "Welcome to my email sending service."
}
~~~
As response, you will receive a message with the result data if your email has been sent successfully, or a error message if your email has not been sent.

## ✨**Technologies**
- [Node.js](https://nodejs.org/en/docs/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Express](https://expressjs.com/)
- [NodeMailer](https://nodemailer.com/about/)

## ⚖**License**
This project is under the license [MIT](./LICENSE).

### Made by [Guilherme Feitosa](https://github.com/Guilherme-FCM/).