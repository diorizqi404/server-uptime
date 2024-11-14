require("dotenv").config();
const Hapi = require("@hapi/hapi");
const axios = require("axios");
const nodemailer = require("nodemailer");
const AWS = require("aws-sdk");

const ssm = new AWS.SSM();

async function getParameter(name) {
  const params = {
      Name: name,
      WithDecryption: false
  };
  const data = await ssm.getParameter(params).promise();
  return data.Parameter.Value;
}

async function setupServer() {
  const serverPort = process.env.SERVER_PORT || await getParameter("SERVER_PORT");
  const serverHost = process.env.SERVER_HOST || await getParameter("SERVER_HOST");

  const server = Hapi.server({
      port: serverPort,
      host: serverHost,
      routes: {
          cors: {
              origin: ['*'],
          },
      },
  });

  return server;
}

const server = await setupServer();
const urls = ["https://kirimja.dioo.my.id"];
const recipient = process.env.RECIPIENT_EMAIL || 'dev404.intern@gmail.com';
const urlStatus = {}

const mailSender = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'cloudiooproject@gmail.com',
    pass: process.env.EMAIL_PASS || 'isthkxsejblaqnij',
  },
});

function sendNotification(url, status) {
  const message = {
    from: process.env.EMAIL_USER || 'cloudiooproject@gmail.com',
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
