const jsdom = require('jsdom');
const { JSDOM } = jsdom
const axios = require('axios');
const testURL = "https://www.isu.org/figure-skating/events/figure-skating-calendar/eventdetail/13635/-/isu-junior-grand-prix-of-figure-skating";
const calendarURL = "https://www.isu.org/figure-skating/events/figure-skating-calendar";

module.exports = class Scrapper {
    constructor() {

    }

    async scrapeCalendar() {

    }

    async scrapeSingleEvent(url) {
        const pageHtml = await this.#getHTML(url);
        const pageInfo = await this.#parsePage(pageHtml);

        return pageInfo;
    }

    async #getHTML(url) {
        const response = await fetch(url);
        const htmlData = await response.text();
        return htmlData;
    }
    async #parsePage(pageHtml) {
        const dom = new JSDOM(pageHtml)
        const document = dom.window.document

        const combinedEventDate = document.querySelector('.date').innerHTML;
        const cover = document.getElementsByClassName('cover')[0]
        let dateArr = this.#extractStartAndEnd(combinedEventDate);
        const imgInfo = document.querySelector('.jev_image1').dataset
        const coverImgLink = `https:${imgInfo.src}`
        let imgB64 = undefined

        if(imgInfo.height >= 320 && imgInfo.width >= 800 ) {
            imgB64 = await this.#convertImageLinkToDataURL(coverImgLink)
        }


        let pageInfo = {
            link: document.baseURI,
            name: cover.querySelectorAll('div > h3')[0].innerHTML,
            coverImgB64: imgB64,
            location: document.querySelector('.location').innerHTML.replace(' /', ', ').slice(1),
            locationLink: cover.querySelector('.info > .map').href,
            scheduledStartTime: new Date(dateArr[1]).toISOString(),
            scheduledEndTime: new Date(dateArr[2]).toISOString(),
        }
        console.log(pageInfo);
        return pageInfo;
    }

    #extractStartAndEnd(dateRangeString) {
        const rx = /^([\w\s,]+)\s-\s([\w\s,]+)\s(\d{4})/;
        let arr = rx.exec(dateRangeString);
        //this adds the year onto the starting date when it is not already present
        if (arr[1].length < arr[2].length) {
            arr[1] += `, ${arr[3]}`
        }
        arr[2] += ` ${arr[3]}`;
        return arr;
    }

    async #convertImageLinkToDataURL(imageUrl) {
        try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            //console.log(`data:image/jpeg;base64,${base64}`)
            return `data:image/jpeg;base64,${base64}`;
            // Logs the base64 string
          } catch (error) {
            console.error(error);
          }
    }
    //checks if the url is from the ISU figure skating events
    checkValidURL(url) {
        pattern = /isu.org\/figure-skating\/events\/figure-skating-calendar\/eventdetail\//
        return pattern.test(url);
    }
}