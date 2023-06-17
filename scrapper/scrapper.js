const jsdom = require('jsdom');
const { JSDOM } = jsdom
const axios = require('axios');
const fs = require('node:fs');

class Scrapper {
    constructor(calendarLimit=0) {
        const calendarURL = 'https://www.isu.org/figure-skating/events/figure-skating-calendar'
        this.calendarLimit = calendarLimit
    }

    async scrapCalendar(calendarURL=this.calendarURL) {
        const pageHtml = await this.getCalendarHTML(calendarURL);
        if (pageHtml !== 'invalid link') {
            const eventLinkArr = await this.#generateEventLinkArr(pageHtml);
            return eventLinkArr;
        }
        return undefined;
    }

    async getCalendarHTML(calendarURl) {
        try {
            
            const response = await fetch("https://www.isu.org/figure-skating/events/figure-skating-calendar", {
                "headers": {
                  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                  "accept-language": "en-US,en;q=0.9,tr;q=0.8",
                  "content-type": "application/x-www-form-urlencoded",
                  "Referer": "https://www.isu.org/figure-skating/events/figure-skating-calendar",
                  "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                "body": `limit=${this.calendarLimit}&limitstart=0`,
                "method": "POST"
              });
            //console.log("response:", response)
            if (!response.ok) {
                //console.log('res from res!ok', response)
                //console.log('res not ok')
                throw new Error('invalid request URL')
            }
            else {
                //console.log("res ok")
                const htmlData = await response.text();
                console.log(htmlData)
                fs.writeFile('testPage.html', htmlData, (err) => {
                    if (err) throw err;
                   });
                return htmlData;
            }
        }
        catch (error) {
            //console.log('catch triggered')
            console.log("catch err:", error)
            console.log('url:', url)
            return 'invalid link'
        }
    }

    async scrapeSingleEvent(url) {
        const pageHtml = await this.#getHTML(url);
        //console.log('pageHTML:', pageHtml)
        if (pageHtml !== 'invalid link') {
            const pageInfo = await this.#parsePage(pageHtml);
            return pageInfo;
        }
        return undefined;
    }

    async #getHTML(url) {
        //console.log("url at the top:", url)
        try {
            const response = await fetch(url) 
            //console.log("response:", response)
            if (!response.ok) {
                //console.log('res from res!ok', response)
                //console.log('res not ok')
                throw new Error('invalid request URL')
            }
            else {
                //console.log("res ok")
                const htmlData = await response.text();
                return htmlData;
            }
        }
        catch (error) {
            //console.log('catch triggered')
            console.log("catch err:", error)
            console.log('url:', url)
            return 'invalid link'
        }
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

        if (imgInfo.height >= 320 && imgInfo.width >= 800) {
            imgB64 = await this.#convertImageLinkToDataURL(coverImgLink)
        }


        let pageInfo = {
            link: document.baseURI,
            name: cover.querySelectorAll('div > h3')[0].innerHTML,
            coverImgB64: imgB64,
            location: document.querySelector('.location').innerHTML.replace(' /', ', ').slice(1),
            locationLink: cover.querySelector('.info > .map').href,
            scheduledStartTime: new Date(dateArr[1]),
            scheduledEndTime: new Date(dateArr[2]),
        }
        //console.log(pageInfo);
        return pageInfo;
    }

    async #generateEventLinkArr(pageHtml) {
        const dom = new JSDOM(pageHtml)
        const document = dom.window.document

        linkArr = []


    }

    #extractStartAndEnd(dateRangeString) {
        const rx = /^([\w\s,]+)\s-\s([\w\s,]+)\s(\d{4})/;
        let arr = rx.exec(dateRangeString);
        //this adds the year onto the starting date when it is not already present
        arr[2] += ` ${arr[3]}`;
        if (arr[1].length < arr[2].length) {
            arr[1] += `, ${arr[3]}`
        }
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
        const pattern = /isu.org\/figure-skating\/events\/figure-skating-calendar\/eventdetail\//
        if (pattern.test(url)) {
            //console.log(`${url}\n^passed regex^`)
            return true
        }
        else {
            //console.log(`${url}\n^DID NOT passed regex^`)
            return false;
        }
    }
}
const scrapper = new Scrapper

const html = scrapper.getCalendarHTML('https://www.isu.org/figure-skating/events/figure-skating-calendar')
console.log(html);
//module.exports = { Scrapper }
