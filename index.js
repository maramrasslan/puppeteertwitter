const fs = require("fs")
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");


//timeout function

function timeout(millieseconds){
    return new Promise((resolve) => {
        setTimeout(() => {resolve()},millieseconds)
    })
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

//extract tweet text
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

async function main(url){
    try {
        const browser = await puppeteer.launch({headless: false});
        var page = await browser.newPage();
        //await page.setDefaultNavigationTimeout(0);
        await page.goto(url);
        await timeout(3000);
        //const html = await page.evaluate(() => document.body.innerHTML);
        //const $ = await cheerio.load(html);
        var resultTweet = [];
        const loopLimit = 10;
        var loopCount = 0;
        while(resultTweet.length < loopLimit){
            await timeout(2000);
            resultTweet= await eval(extractItems(page)); //eval to solve Error: Passed function cannot be serialized!
            console.log(resultTweet);
            loopCount++ ;
        }
        

    } catch(err){
        console.error(err);
    }
}


main("https://twitter.com/javascript");


/* Important 
*notification pop up selector data-testid="app-bar-close" 
*need to see if it pops up to close it as it blocks the normal 
*functioning of the page */
