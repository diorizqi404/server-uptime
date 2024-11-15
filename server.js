import dotenv from 'dotenv';
import fs from 'fs';
import Hapi from '@hapi/hapi';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

dotenv.config();

function getPublicIp() {
  const data = fs.readFileSync('public_ip.config', 'utf8');
  const match = data.match(/PUBLIC_IP=(.*)/);
  return match ? match[1] : null;
}

export const publicIp = getPublicIp(); // Menyimpan IP dalam variabel

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
  const serverPort = process.env.SERVER_PORT || await getParameter("SERVER_PORT");
  const serverHost = process.env.SERVER_HOST || await getParameter("SERVER_HOST");

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
  const smtpHost = process.env.SMTP_HOST || await getParameter("SMTP_HOST");
  const smtpPort = process.env.SMTP_PORT || await getParameter("SMTP_PORT");
  const emailUser = process.env.EMAIL_USER || await getParameter("EMAIL_USER");
  const emailPass = process.env.EMAIL_PASS || await getParameter("EMAIL_PASS");

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
const urls = ["https://kirimja.dioo.my.id"];
const recipient = process.env.RECIPIENT_EMAIL || await getParameter("RECIPIENT_EMAIL");
const urlStatus = {}

async function sendNotification(url, status) {
  const message = {
    from: process.env.EMAIL_USER || await getParameter("RECIPIENT_EMAIL"),
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
