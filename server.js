import Hapi from '@hapi/hapi';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: 'us-east-1' }); // Ganti dengan region yang sesuai

async function getParameter(name) {
  const command = new GetParameterCommand({
      Name: name,
      WithDecryption: false
  });
  const data = await ssmClient.send(command);
  return data.Parameter.Value;
}

async function setupServer() {
  const serverPort = await getParameter("SERVER_PORT");
  const serverHost = await getParameter("SERVER_HOST");

  return Hapi.server({
      port: serverPort,
      host: serverHost,
      routes: {
          cors: {
              origin: ['*'],
          },
      },
  });
}

async function setupMailSender() {
  const smtpHost = await getParameter("SMTP_HOST");
  const smtpPort = await getParameter("SMTP_PORT");
  const emailUser = await getParameter("EMAIL_USER");
  const emailPass = await getParameter("EMAIL_PASS");

  return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true,
      auth: {
          user: emailUser,
          pass: emailPass,
      },
  });
}

const server = await setupServer();
const mailSender = await setupMailSender();
const urls = ["https://kirimaja.dioo.my.id", "https://dioo.my.id", "https://s.dioo.my.id"];
const recipient = await getParameter("RECIPIENT_EMAIL");
const urlStatus = {}

async function sendNotification(url, status) {
  const message = {
    from: await getParameter("RECIPIENT_EMAIL"),
    to: recipient,
    subject: "UPTIME ALERT❗❗❗",
    text: `${url} is ${status}!`,
  };

  mailSender.sendMail(message, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
}

async function checkUptime() {
  for (const url of urls) {
    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        console.log(`${url} is up🚀`);
        if (urlStatus[url] === "down") {
            sendNotification(url, "up");
        }
        urlStatus[url] = "up";
      } else {
        console.log(`${url} is down🔥 (Status Code: ${response.status})`);
        if (urlStatus[url] !== "down") {
            sendNotification(url, "down");
        }
        urlStatus[url] = "down";
      }
    } catch (error) {
      console.log(`${url} is down🔥 (Status Code: ${error.message})`);
      if (urlStatus[url] !== "down") {
        sendNotification(url, "down");
      }
      urlStatus[url] = "down";
    }
  }
}

checkUptime()
setInterval(checkUptime, 30000);

server.route({
  method: "GET",
  path: "/",
  handler: (request, h) => {
    return urlStatus;
  },
});

const init = async () => {
  await server.start();
  console.log("Server running on", server.info.uri);
};

init();
