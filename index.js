/*
  
  Jacob Waller - 2018
  jacobwaller.com

  Chicago E-Skate

*/
const Telegraf = require("telegraf");
const request = require("request");
const cheerio = require("cheerio");
const rp = require("request-promise");
const fs = require('fs');
var jsdom = require("jsdom");
var mysql = require("mysql");
var schedule = require("node-schedule");
var basicCommands = require("./basicCommands.json");

const { Markup } = require("telegraf");

require("dotenv").config();

let BOT_TOKEN = process.env.BOT_TOKEN;
let DARKSKY_TOKEN = process.env.DARKSKY_TOKEN;
let OPENWEATHER_TOKEN = process.env.OPENWEATHER_TOKEN;
let GROUP_ID = process.env.GROUP_ID;
let SECRET_COMMAND = process.env.SECRET_COMMAND;

//Credentials for the SQL server
let sql_creds = require("./sql_creds.json");

const bot = new Telegraf(BOT_TOKEN, { username: "ChiSk8_bot" });

//Generic Error message
const errorMsg =
  "There was an error. Try again later. \n@jacob_waller Look at logs pls";


//Says
//Good morning
//Weather
//Whether or not a group ride is today or tomorrow
function dailyMessage() {
  var resp = "Good morning!\n";
  bot.telegram.sendMessage(GROUP_ID, resp);

  //Get weather for the day
  request(
    `https://api.darksky.net/forecast/${DARKSKY_TOKEN}/41.8781,-87.6298`,
    function(err, response, body) {
      if (err) {
        console.log("Oops");
      } else {
        try {
          let con = JSON.parse(body);
          resp =
            "Today in Chicago you can expect a high of " +
            con.daily.data[0].temperatureMax +
            " and a low of " +
            con.daily.data[0].temperatureMin +
            ".\n";
          resp +=
            "Weather summary for the day: " + con.daily.data[0].summary + "\n";
          bot.telegram.sendMessage(GROUP_ID, resp);
        } catch (error) {
          console.log(error);
          return;
        }
      }
    }
  );

  //determine if there is a group ride today or tomorrow.
  var con = mysql.createConnection(sql_creds);
  con.connect(function(err) {
    if (err) throw err;
    con.query(
      "SELECT start, end, CONVERT(start_date, Date) AS start_date, TIME_FORMAT(start_time,\"%h:%i %p\") AS start_time, title FROM Events WHERE Events.start_date = CURDATE() OR Events.start_date-1=CURDATE() ORDER BY ABS(DATEDIFF(start_date, NOW())) LIMIT 1;",
      function(err, result, fields) {
        if (err) throw err;
        console.log(result);
        try {
          resp =
            "There is a group ride on " +
            result[0].start_date.toString().substring(0, 15) +
            " titled: " + result[0].title +
            ". It is at at " +
            result[0].start_time +
            ".\n";
          resp +=
            "It starts at " + result[0].start + " and ends at " + result[0].end;
          bot.telegram.sendMessage(GROUP_ID, resp);
        } catch (error) {
          bot.telegram.sendMessage(
            GROUP_ID,
            "There are no group rides today or tomorrow"
          );
        }
      }
    );
  });
}

var s = schedule.scheduleJob("0 11 * * *", () => {
  dailyMessage();
});

//Analytics
function analytics(ctx) {
  fs.appendFileSync('log.txt', ctx.message.text.toString()+"\n");
}

bot.start(ctx => {
  ctx.reply(
    "Hi! I'm the Chicago E-Skate bot! I can give you weather information, helmet recommendations, and helpful links! Type /help for a list of available commands."
  );
  //fs.appendFileSync('log.txt', 'start');
  }
);
bot.help(ctx =>
  ctx.reply(
    "Hi! I\'m here to answer some questions. If you want to add a feature, DM @jacob_waller. Also, be advised I am in the Pre-est of Alphas. Things may not work correctly\n\n"+
    "/weather: Get current weather conditions\n"+
    "/forecast: Get the forecast of the next few days\n"+
    "/helmets: Get a list of links to some pretty good helmets\n"+
    "/links: Get a list of helpful links for newcomers or those who are curious\n"+
    "/group_ride: Gives information on the next group ride\n"+
    "/charge: Gives the charging map for Chicago\n"+
    "/nosedive: idk some OneWheel meme\n"+
    "/bearings: shows a gif on how to remove bearings from a wheel\n"+
    "/battery: shows a video on how to replace the battery on a Boosted Board\n\n"+
    "Version: 0.8"
  )
);

//Generic Command Section. Commands defined in basicCommands.json
for(var i=0;i<basicCommands.length;i++) {
  bot.command(basicCommands[i].commands, ctx => {
    ctx.reply(basicCommands[i].response);
    analytics(ctx);
  })
}

//rank section
var a = 0,
  b = 0,
  c = 0,
  d = 0;
var votedRank = [];
const rankInline = Markup.inlineKeyboard([
  Markup.callbackButton("A", "A"),
  Markup.callbackButton("B", "B"),
  Markup.callbackButton("C", "C"),
  Markup.callbackButton("D", "D")
]).extra();

bot.command("rank", ctx => {
  try {
    a = 0;
    b = 0;
    c = 0;
    d = 0;
    votedRank = [];
    ctx.telegram.sendMessage(GROUP_ID, "Poll:", rankInline);
  } catch (error) {}
  analytics(ctx);
});
bot.command("rankresults", ctx => {
  ctx.reply(
    "Here are the results:\nA: " + a + " B: " + b + "\nC: " + c + " D: " + d
  );
  analytics(ctx);
});

bot.action("A", ctx => {
  if (!votedRank.includes(ctx.update.callback_query.from.id)) {
    votedRank.push(ctx.update.callback_query.from.id);
    a++;
  }
});
bot.action("B", ctx => {
  if (!votedRank.includes(ctx.update.callback_query.from.id)) {
    votedRank.push(ctx.update.callback_query.from.id);
    b++;
  }
});
bot.action("C", ctx => {
  if (!votedRank.includes(ctx.update.callback_query.from.id)) {
    votedRank.push(ctx.update.callback_query.from.id);
    c++;
  }
});
bot.action("D", ctx => {
  if (!votedRank.includes(ctx.update.callback_query.from.id)) {
    votedRank.push(ctx.update.callback_query.from.id);
    d++;
  }
});
//end rank section

//Poll section
var yes = 0;
var no = 0;
var voted = [];
const pollInline = Markup.inlineKeyboard([
  Markup.callbackButton("A", "like"),
  Markup.callbackButton("B", "dislike")
]).extra();
bot.command("poll", ctx => {
  try {
    console.log(ctx.message);
    yes = 0;
    no = 0;
    voted = [];
    ctx.telegram.sendMessage(GROUP_ID, "Poll:", pollInline);
  } catch (error) {}
  analytics(ctx);
});
bot.command("pollresults", ctx => {
  ctx.reply("Here are the results:\nA: " + yes + " B: " + no);
  analytics(ctx);
});
bot.action("like", ctx => {
  if (!voted.includes(ctx.update.callback_query.from.id)) {
    voted.push(ctx.update.callback_query.from.id);
    yes++;
  }
});
bot.action("dislike", ctx => {
  if (!voted.includes(ctx.update.callback_query.from.id)) {
    voted.push(ctx.update.callback_query.from.id);
    no++;
  }
});
//End Poll Section

bot.command(SECRET_COMMAND, ctx => {
	console.log(ctx.message.text);
	ctx.reply(ctx.message.text.toString().substring(6));
  ctx.telegram.sendMessage(GROUP_ID,ctx.message.text.toString().substring(6));
  analytics(ctx);
});

bot.on("new_chat_members", ctx => {
  var resp =  "Hey! Welcome to the Chicago E-Skate Telegram.\n"+
              "For a map on places to charge, check out: https://www.google.com/maps/d/edit?mid=1KIzwP95pZD0A3CWmjC6lcMD29f4&usp=sharing\n"+
              "For info on the next group ride, click: /group_ride\n"+
              "For even more info, check out: https://www.facebook.com/groups/chicagoeskate/events/\n"+
              "If you want to know more about what I can do, click /help\n";

  ctx.reply(resp);
});

var group_ride_comms = ["group_ride", "groupride", "ride", "rides"];
bot.command(group_ride_comms, ctx => {
  var con = mysql.createConnection(sql_creds);
  con.connect(function(err) {
    if (err) throw err;
    con.query(
      "SELECT start, end, CONVERT(start_date, Date) AS start_date, TIME_FORMAT(start_time,\"%h:%i %p\") AS start_time, title FROM Events WHERE Events.start_date >= CURDATE() ORDER BY ABS(DATEDIFF(start_date, NOW())) LIMIT 1;",
      function(err, result, fields) {
        if (err) throw err;
        console.log(result);
        var resp =
          "The next event is titled " +
          result[0].title + ". It starts at " +
          result[0].start +
          " on " +
          result[0].start_date.toString().substring(0, 15) +
          " at " +
          result[0].start_time +
          ". It goes to " +
          result[0].end;
        ctx.reply(
          resp +
            ". For more info, go to: https://www.facebook.com/groups/chicagoeskate/events/ for a current list of events"
        );
      }
    );
  });
  analytics(ctx);
});

bot.command("weather", ctx => {
  //Get current weather
  request(
    `http://api.openweathermap.org/data/2.5/weather?q=Chicago,US&APPID=${OPENWEATHER_TOKEN}&units=imperial`,
    function(err, response, body) {
      if (err) {
        ctx.reply(
          "Wow, there must have been an error... I can't get the weather information. oof @jacob_waller pls help..."
        );
      } else {
        try {
          let con = JSON.parse(body);
          var condition = con.weather[0].description;

          var isRaining = false;
          var isClear = false;

          for (var i = 0; i < con.weather.length; i++) {
            var id = con.weather[i].id;
            if ((id >= 200 && id <= 399) || (id >= 500 && id <= 699)) {
              isRaining = true;
            }
            if (id == 800) {
              isClear = true;
            }
          }

          var temp = con.main.temp;
          var resp =
            "It is " +
            temp +
            " degrees F. Currently the condition is labeled as: " +
            condition +
            ". ";

          if (isRaining) {
            resp += "It is raining and we are all sad because of it.";
          }

          if (isClear && !isRaining) {
            resp += "It's clear! Get out there and ride ðŸ¤™";
          }

          ctx.reply(resp);
        } catch (error) {
          ctx.reply("Error fetching weather... Try again later...");
          console.log(error);
        }
      }
    }
  );
  analytics(ctx);
});

bot.command("forecast", ctx => {
  //Get weather for the week
  request(
    `https://api.darksky.net/forecast/${DARKSKY_TOKEN}/41.8781,-87.6298`,
    function(err, response, body) {
      if (err) {
        ctx.reply(
          "Wow, there must have been an error... I can't get the weather information. oof @jacob_waller, pls help me"
        );
      } else {
        try {
          let con = JSON.parse(body);

          var shortTerm = con.minutely.summary;

          var thisWeek = con.daily.summary;

          var resp = "" + shortTerm + " \n\n**This Week**\n" + thisWeek;

          ctx.reply(resp);
        } catch (error) {
          console.log(error);
          ctx.reply(errorMsg);
        }
      }
    }
  );
  analytics(ctx);
});

bot.startPolling();