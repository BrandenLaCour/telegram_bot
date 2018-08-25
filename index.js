/*
  Jacob Waller - 2018
*/
const Telegraf = require("telegraf");
const request = require("request");
const cheerio = require("cheerio");
const rp = require("request-promise");
var jsdom = require("jsdom");
var mysql = require("mysql");
var schedule = require("node-schedule");

const { Markup } = require("telegraf");

require("dotenv").config();


//These are individual tokens used throughout the code for API's.
//You would need to define these environment variables
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

bot.start(ctx =>
  ctx.reply(
    "Hi! I'm the Chicago E-Skate bot! I can give you weather information, helmet recommendations, and helpful links! Type /help for a list of available commands."
  )
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

//How to replace a battery on a Boosted Board V2
var battery_comms = [
  "battery",
  "batteries",
  "replace_battery",
  "replacebattery",
  "batterys",
  "electron_holder"
];
bot.command(battery_comms, ctx => {
  ctx.reply("https://www.youtube.com/watch?v=g-JsaT8N6rk");
});

//Don't worry about these next two sections of garbage. they're for voting and whatnot.

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
});
bot.command("rankresults", ctx => {
  ctx.reply(
    "Here are the results:\nA: " + a + " B: " + b + "\nC: " + c + " D: " + d
  );
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
});
bot.command("pollresults", ctx => {
  ctx.reply("Here are the results:\nA: " + yes + " B: " + no);
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
});

bot.on("new_chat_members", ctx => {
  var resp =  "Hey! Welcome to the Chicago E-Skate Telegram.\n"+
              "For a map on places to charge, check out: https://www.google.com/maps/d/edit?mid=1KIzwP95pZD0A3CWmjC6lcMD29f4&usp=sharing\n"+
              "For info on the next group ride, click: /group_ride\n"+
              "For even more info, check out: https://www.facebook.com/groups/chicagoeskate/events/\n"+
              "If you want to know more about what I can do, click /help\n";

  ctx.reply(resp);
});

var milk_comms = ["milk", "milked"];
bot.command(milk_comms, ctx => {
  ctx.reply(
    "https://www.instagram.com/p/BW0r8wrlSMJ/?utm_source=ig_share_sheet&igshid=1se0j38gw1fl8"
  );
});

var rand_comms = [
  "redpepper",
  "notagain",
  "lodge",
  "thelodge",
  "TheLodge",
  "theLodge",
  "the_lodge",
  "Guinness"
];
bot.command(rand_comms, ctx => {
  ctx.reply("Shut up Justin\nhttps://i.imgur.com/akZxbAa.jpg");
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
          result[0].title + ". It starts at "
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

  //ctx.reply("Something went wrong. @jacob_waller");
});

var pads_comms = [
	"pads",
	"owie",
	"kneepads",
	"elbowpads",
	"knee_pads",
	"elbow_pads",
	"armor",
	"i_dont_wanna_die"
];

bot.command(pads_comms, ctx => {
	ctx.reply(
    "https://g-form.com/\n"+
    "https://www.revzilla.com/motorcycle/speed-and-strength-critical-mass-jeans\n"+
    "https://www.revzilla.com/motorcycle/speed-and-strength-true-romance-womens-jeans\n"+
    "https://www.amazon.com/dp/B00829IFWQ/ref=cm_sw_r_cp_apa_HBfBBbW8594ZH\n"+
    "https://www.amazon.com/dp/B07735T8CC/ref=cm_sw_r_cp_apa_rCfBBbE1AF3A4");
});

var winter_comms = [
	"wintergear",
	"winter",
	"cold",
	"its_cold_as_fuck_wtf",
	"chilly",
	"winter_gear",
	"its_cold_as_fuck"
]

bot.command(winter_comms, ctx => {
	ctx.reply(
    "https://www.revzilla.com/motorcycle/speed-and-strength-straight-savage-jacket\n"+
    "https://www.revzilla.com/motorcycle/speed-and-strength-double-take-womens-jacket\n"+
    "https://www.amazon.com/dp/B01H50RCY4/ref=cm_sw_r_cp_apa_LHfBBbBA59EA4\n"+
    "https://www.amazon.com/dp/B01H50RDW0/ref=cm_sw_r_cp_apa_7HfBBbYREWEDV\n"+
    "https://www.amazon.com/dp/B01E5PJ41G/ref=cm_sw_r_cp_apa_FIfBBb952B924\n"+
    "https://www.amazon.com/dp/B075SJB7N1/ref=cm_sw_r_cp_apa_aJfBBbVQNWKG5\n"+
    "https://www.revzilla.com/motorcycle/knox-hanbury-mk1-gloves\n"+
    "https://www.vans.com/shop/sk8hi-mte");
});

var bearing_comms = [
  "bearing",
  "bearings",
  "bearing_change",
  "bearingchange",
  "change_bearings",
  "changebearings"
];
bot.command(bearing_comms, ctx => {
  ctx.reply("https://www.amazon.com/dp/B01MYG7WT0/ref=cm_sw_r_cp_apa_mVdBBb5F203E4\nhttps://media.giphy.com/media/7zAgRCl0lkUSDNp6Y7/giphy.mp4");
});

var charging_comms = [
  "charging",
  "charge",
  "charger",
  "charge_location",
  "charge_locations"
];
bot.command(charging_comms, ctx => {
  console.log(ctx.chat.id);
  ctx.reply(
    "https://www.google.com/maps/d/edit?mid=1KIzwP95pZD0A3CWmjC6lcMD29f4&usp=sharing"
  );
});

var links_comms = ["helpful_links", "links", "link", "helpfullinks"];
bot.command(links_comms, ctx => {
  var helmetThing = "Charging Map: https://www.google.com/maps/d/edit?mid=1KIzwP95pZD0A3CWmjC6lcMD29f4&usp=sharing\n"+
                    "Boosted Board Riders Chicago: https://www.facebook.com/groups/BoostedCHI\n"+
                    "Chicago E-Skate: https://www.facebook.com/groups/chicagoeskate/\n"+
                    "Invite Link for Telegram: https://t.me/joinchat/GGTLCBDOaknv45USExpJSw\n"+
                    "Announcement Telegram: https://t.me/joinchat/AAAAAEwbHWf-hVIT53a75Q"

  ctx.reply(helmetThing);
});

var helmet_comms = [
  "helmet",
  "helmets",
  "helmet_recommendations",
  "brain_bucket"
];
bot.command(helmet_comms, ctx => {
  var helmetThing = 
  "http://www.bernunlimited.com/\n"+
  "https://www.explorethousand.com/\n"+
  "https://www.ruroc.com/en/\n"+
  "https://shop.boostedboards.com/products/boosted-helmet\n"+
  "https://www.pocsports.com/us/cycling-helmets/commuter/";

  ctx.reply(helmetThing);
});

var belt_comms = ["belts", "belt"];
bot.command(belt_comms, ctx => {
  var resp = 
    "The belts we use are 225-3M-15\n"+
    "They can be purchased from: \n"+
    "https://shop.boostedboards.com/products/2nd-gen-belt-kit\n"+
    "https://www.royalsupply.com/store/pc/Gates-225-3M-15-PowerGrip-HTD-Belt-9293-0395-p18067.htm\n"+
    "https://www.amazon.com/JVgear-Boosted-Board-Belts-Stealth/dp/B076HKPKLF/ref=sr_1_3?ie=UTF8&qid=1530303696&sr=8-3&keywords=boosted+board+belts";
  ctx.reply(resp);
});

bot.command("nosedive", ctx => {
  ctx.reply("ayy lmao\nhttps://www.youtube.com/watch?v=kc6IEVV9mp0&t=20s");
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
          ctx.reply(errorMsg);
          console.log(error);
        }
      }
    }
  );
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
});

bot.startPolling();
