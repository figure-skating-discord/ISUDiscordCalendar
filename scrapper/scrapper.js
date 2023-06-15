const jsdom = require('jsdom');
const { JSDOM } = jsdom
const axios = require('axios');

class Scrapper {
    constructor() {

    }

    async scrapCalendar() {

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
        console.log("url at the top:", url)
        try {
            const response = await fetch(url) 
            //console.log("response:", response)
            if (!response.ok) {
                //console.log('res from res!ok', response)
                //console.log('res not ok')
                throw new Error('invalid request URL')
            }
            else {
                console.log("res ok")
                const htmlData = await response.text();
                return htmlData;
            }
        }
        catch (error) {
            console.log('catch triggered')
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
            scheduledStartTime: new Date(dateArr[1]).toISOString(),
            scheduledEndTime: new Date(dateArr[2]).toISOString(),
        }
        //console.log(pageInfo);
        return pageInfo;
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
        return pattern.test(url);
    }
}

module.exports = { Scrapper }

