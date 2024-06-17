const fs = require("fs")
const puppeteer = require("puppeteer");
//const cheerio = require("cheerio");



//timeout function

function timeout(millieseconds){
    return new Promise((resolve) => {
        setTimeout(() => {resolve()},millieseconds)
    })
}

//object to csv function 

function objectToCsv(data) {
     
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header]
            return `"${val}"`;
        });
 
        // To add, separator between each value
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}

//extract date 
async function extractDate(page){
    await timeout(1000);
    await page.waitForSelector('[data-testid=\"tweet\"] [data-testid=\"User-Name\"] ');
    const extractedDates = page.evaluate(()=> Array.from(
        document.querySelectorAll("[data-testid=\"tweet\"] [data-testid=\"User-Name\"] a[role=\"link\"] time[datetime]")
    ).map(element => element.dateTime) );
    return extractedDates
}
//extract tweet link and date
async function extractTlinkTdate(page){
    await timeout(1000);
    await page.evaluate(() => {
        window.scrollBy(0,1000);
    })   
    //extract all 3 links
    await timeout(1000);
    await page.waitForSelector('[data-testid=\"tweet\"] [data-testid=\"User-Name\"]');
    const extractedLINKS = page.evaluate(()=> Array.from(
        document.querySelectorAll("[data-testid=\"tweet\"] [data-testid=\"User-Name\"] a[role=\"link\"]") 
    ).map(tweet => tweet.href) );
    //extract only the third link to get the tweet link
    let extractedLinks = [];
    for(i=2;i<(await eval(extractedLINKS)).length;i=i+3){
        extractedLinks.push((await eval(extractedLINKS))[i]);
    }
    //add date and link to array of objects
    var extractedDates=[];
    extractedDates = await eval(extractDate(page));
    var linkDateList = [];
    for(i=0;i<extractedLinks.length;i++){
        var obj = {TweetLink:extractedLinks[i],TweetDate:extractedDates[i]};
        linkDateList.push(obj);
    }
    return linkDateList;
}

//extract tweet text date and link
async function extractItems(page){
    await timeout(1000);
    var resultDateLink =[];
    resultDateLink = await eval(extractTlinkTdate(page));
    await page.waitForSelector('[data-testid=\"tweetText\"]');
    const extractedItemsText = page.evaluate(()=> Array.from(
        document.querySelectorAll("[data-testid=\"tweetText\"]")
        //used evaluate to solve document not found 
    ).map(element => element.innerText) );
    //add text to the objects 
    var extractedTweets=[];
    for(i=0;i<resultDateLink.length;i++){
        var newObj = {
            TweetLink:resultDateLink[i].TweetLink,
            TweetDate:resultDateLink[i].TweetDate,
            TweetText:(await eval(extractedItemsText))[i]
        };
        extractedTweets.push(newObj);
    }
   
    return extractedTweets;
}

/* extract tweet links 
 * selector for all 3 links in the tweet(we only need the third)(we can extract all three then make another 
 * loop to extract the third one only)
 * document.querySelectorAll("[data-testid=\"tweet\"] [data-testid=\"User-Name\"] a[role=\"link\"]")
 * the date and time is in this selector as well 
 * document.querySelectorAll("[data-testid=\"tweet\"] [data-testid=\"User-Name\"] a[role=\"link\"] time[datetime]")
 */

/* I should make an object that has tweet text and date and store in array 
 * with the key being the tweet link , and make the while loop inside the function not in main*/

async function SearchByProfile(username,loopLimit,keyword,startDate,endDate,startTime,endTime){
    try {
        //setup profile page 
        const url = `https://twitter.com/${username}`;
        const browser = await puppeteer.launch({headless: false});
        var page = await browser.newPage();
        await page.goto(url);
        await timeout(3000);
        //const and vars 
        const defaultLimit = 10;
        var resultTweet = [];
        var output =[];
        var foundKeyword = false;
        var foundDate = false;
        var foundTime = false;
        if(loopLimit==null){loopLimit=defaultLimit;}

        while(output.length < loopLimit){
            await timeout(2000);
            resultTweet= await eval(extractItems(page)); //eval to solve Error: Passed function cannot be serialized!
            for(const tweet of resultTweet){
                let index = output.findIndex((item) => item.TweetLink === tweet.TweetLink);
                //logic to find the keyword in the text
                var tweettext = (tweet.TweetText).toLowerCase();
                keyword = keyword.toLowerCase();
                if((tweettext.indexOf(keyword))>=0 || keyword==""){
                    foundKeyword=true;
                }else{foundKeyword=false;}
                //logic to test the date filter
                var date = new Date(tweet.TweetDate);
                if(startDate!="" || endDate!=""){
                    startDate = new Date(startDate);
                    endDate = new Date(endDate);
                    if(date >= startDate && date <= endDate){
                        foundDate=true;
                    }else{foundDate=false;}
                }else{foundDate=true;}
                //logic to test time filter
                if(startTime!="" || endTime!=""){
                    const hours = date.getUTCHours();
                    const minutes = date.getUTCMinutes();
                    const seconds = date.getUTCSeconds();
                    const extractedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    const today = new Date().toISOString().slice(0, 10);
                    const startTimeObj = new Date(`${today}T${startTime}Z`);
                    const endTimeObj = new Date(`${today}T${endTime}Z`);
                    const extractedTimeObj = new Date(`${today}T${extractedTime}Z`);
                    if (extractedTimeObj >= startTimeObj && extractedTimeObj <= endTimeObj) {
                        foundTime=true;
                    }else{foundTime=false;}
                }else{foundTime=true;}
                //check if all filters apply to the tweet then add it 
                if(index === -1 && output.length < loopLimit && foundKeyword==true && foundDate==true){
                    output.push(tweet);
                }
            }
        }
        const slicedOutput = output.slice(0,loopLimit)
        console.log(slicedOutput);
        const csvData = objectToCsv(slicedOutput);
        fs.writeFile ("output.csv", csvData, function(err) {
            if (err) throw err;
            console.log('write to csv file complete');
            }
        );
        console.log(output.length);

    } catch(err){
        console.error(err);
    }
}

//Function that executes if we search by keyword
async function SearchByKeyword(keyword,noResults,startDate,endDate,startTime,endTime){

}

async function main(searchMetod,username,loopLimit,keyword,startDate,endDate,startTime,endTime){
    switch(searchMetod){
    case "Search in user profile":
        SearchByProfile("javascript",4,"you","2022-01-01","2023-01-01","13:00:00","17:00:00");
        break;
    case "Search by keyword":
        SearchByKeyword("",3,"","","","");
        break;
    default:
        console.log("please choose a method");
    }
}

main("Search in user profile");

/* Important 
*notification pop up selector data-testid="app-bar-close" 
*need to see if it pops up to close it as it blocks the normal 
*functioning of the page */
