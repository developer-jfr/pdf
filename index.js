const puppeteer = require("puppeteer-extra");
const fs = require("fs");
let investors_json = require("./new.json");
const path = require("path");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

let scrape = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 10,
  });

  const loginPage = await browser.newPage();

  await loginPage.goto("https://www.crunchbase.com/login");
  await loginPage.waitForTimeout(2000);
  await loginPage.waitForSelector("login");
  await loginPage.type("input[name=email]", "Lohire5806@leafzie.com");

  await loginPage.type("input[name=password]", "Lohire5806@leafzie.com");
  await loginPage.waitForTimeout(2000);
  await loginPage.keyboard.press(String.fromCharCode(13));
  await loginPage.waitForNavigation({
    waitUntil: "load",
  });
  await loginPage.close();

  let results;
  for (let i = 1925, total_urls = investors_json.length; i < total_urls; i++) {
   try {
     
    const page2 = await browser.newPage();
    const companyPage = await browser.newPage();
    const financialPage = await browser.newPage();

    await page2.setDefaultNavigationTimeout(0);

    await companyPage.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36"
    );

    await companyPage.setDefaultNavigationTimeout(0);

    results = await getInfo(page2, investors_json[i].link, companyPage,  investors_json[i].id, financialPage);
    let data = JSON.parse(
      await fs.readFileSync(
        "full2.json"
      )
    );

    data.push(results);

    fs.writeFileSync(
      "full2.json",
      JSON.stringify(data, null, 2)
    );

    await Promise.all([page2.close(), companyPage.close(), financialPage.close()]);
   } catch (e) {
  console.log(e)
   }
    
  }

  return results;
};

const getInfo = async (page, url, companyPage, i, financialPage) => {
  await page.goto(url, { waitUntil: "load", timeout: 0 });

  let dataCompany = {
    summary: {
      info: {},
      about: {},
      highlights: {},
      details: {
        socialMedias: {}
      },
      listOfInvesmentCompanyInfo: [],
      personalInvesments: {},
      investments: {
        highlights: {},
      },
      financials: {}
    },
  };




  

  let c = await page.evaluate(
    async (dataCompany, i, url) => {
      function camelize(str) {
        return str
          ?.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index === 0 ? word?.toLowerCase() : word?.toUpperCase();
          })
          ?.replace(/\s+/g, "");
      }
     
          // highlights
          const container2 = document?.querySelectorAll(".one-of-many-section")[1];
          const content = container2?.querySelectorAll(
            "profile-section mat-card anchored-values .spacer"
          );
    
          content.forEach((elem) => {
            let label = elem?.querySelector(".info label-with-info")?.innerText;
            const value = elem?.querySelector(".info field-formatter")?.innerText;
            label = camelize(label);
    
            dataCompany.summary.highlights[label] = value;
          });
    

      //About
			const container1 = document?.querySelectorAll('.one-of-many-section')[0]
			const description = container1?.querySelector('profile-section mat-card .description')?.innerText
			const infoList = container1?.querySelectorAll('ul li')
			const cdk = document?.querySelector('.cdk-describedby-message-container')
      const fullName =
      document?.querySelector(
        "body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > profile-header > div > header > div > div > div > div.identifier-nav > div.identifier-nav-title.ng-star-inserted > h1"
      )?.innerText || "";



    dataCompany.summary.about['companyName'] = fullName;

    dataCompany.summary.info["id"] = i;
    dataCompany.summary.info["url"] = url;
 
			infoList?.forEach(elem => {
				try {
					let label = elem?.querySelector('field-formatter')?.innerText
					const altClass = elem?.querySelector('theme-icon')?.getAttribute('aria-describedby')
					const altLabel = cdk?.querySelector(`#${altClass}`)?.innerHTML
					dataCompany.summary.about[camelize(altLabel)] = label
				} catch (e) {
					console.log(e);
				}
			})

			dataCompany.summary.about.description = description

      // Details
      const mainContent = document?.querySelector(".main-content");
      const expDescription = document?.querySelectorAll(
        "description-card > div"
      )[1];
     
      const textValueContent = mainContent?.querySelectorAll(
        "ul.text_and_value li"
      );
      

      textValueContent?.forEach((elem) => {
       
        let label = elem?.querySelector(".wrappable-label-with-info")?.innerText;
        let value = elem?.querySelector("field-formatter")?.innerText;

        label = camelize(label);

        if(label === 'industries') {
             value = value?.split('\n');
        }
       
        dataCompany.summary.details[label] = value;
      });
      try {
        expDescription.classList.add("expanded");
        dataCompany.summary.details.description = expDescription?.innerText;
      } catch (e) {}

      const rows = document?.querySelectorAll("row-card");
      
      let featureArray;
      let notRow = [];
      rows.forEach((value) => {
        if (
          value
            .querySelector("h2")
            ?.innerText.includes("Lists Featuring This Company")
        ) {
          featureArray = value;
        } else if (!value?.querySelector('h2')?.innerText.includes('About') & !value?.querySelector('h2')?.innerText.includes('Details')) {
          notRow.push(value)
        }
      });

      let newRows = [...new Set(notRow)];

      newRows?.forEach((row) => {
        const tableRows = row?.querySelectorAll("tbody tr");
        const blockTitle = camelize(
          row?.querySelector(".section-title")?.innerText || ""
        );

        dataCompany.summary[blockTitle] = {};

        const items = document?.querySelectorAll("anchored-values a");

        items?.forEach((item) => {
          const label = item?.querySelector("label-with-info")?.innerText;
          const value = item?.querySelector("field-formatter")?.innerText;
          dataCompany.summary.highlights[camelize(label)] = value;
        });

        //Big Values
        let bigValues = row?.querySelectorAll("big-values-card div");
        let description =
          row?.querySelector("phrase-list-card")?.innerText || "";

        bigValues?.forEach((element) => {
          let label = element?.querySelector("label-with-info")?.innerText || "";
          let info = element?.querySelector("field-formatter")?.innerText || "";
          label = camelize(label);

          dataCompany.summary[blockTitle][label] = info;
        });
        dataCompany.summary[blockTitle].description = description;

        //Details

        const textValueContent = row?.querySelectorAll("ul.text_and_value li");

        textValueContent?.forEach((elem) => {
          let label =
            elem?.querySelector(".wrappable-label-with-info")?.innerText || "";
          const value = elem?.querySelector("field-formatter")?.innerText || "";

          label = camelize(label);

          dataCompany.summary[blockTitle][label] = value;
        });

        const tableHead = row?.querySelectorAll("thead th");
        const headers = [];

        tableHead?.forEach((elem) => {
          const label = camelize(
            elem?.querySelector("label-with-info")?.innerText
          );
          headers.push(label);
        });
        let table = [];
        tableRows?.forEach((elem) => {
          const cells = elem?.querySelectorAll("td");
          const obj = {};
          cells.forEach((cell, i) => {
            obj[headers[i]] = cell?.innerText;
          });

          table.push(obj);
        });
        dataCompany.summary[blockTitle].table = table;
      });

      

      let name = featureArray?.querySelector("h2")?.innerText;
      name = camelize(name);
      let companyRow = featureArray?.querySelectorAll(
        "body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > page-centered-layout:nth-child(3) > div > div > div.main-content > row-card:nth-child(2) > profile-section > section-card > mat-card > div.section-content-wrapper > div > hub-list-card > div > div.flex.layout-column.layout-align-center-start"
      );
      dataCompany.summary[name] = {};
      dataCompany.summary[name]["companies"] = null;

      let array = [];

      companyRow?.forEach((value) => {
        let companyName = value?.querySelector("a")?.innerText;
        let subTitle = value?.querySelector(
          'div[class="subtext hide show-gt-sm cb-margin-medium-top"]'
        )?.innerText;

        let obj = {
          companyName,
          subTitle,
        };

        array.push(obj);
      });
      dataCompany.summary[name]["companies"] = array;


      //Social MEdias
     const socialMeadias =  Array.from(document?.querySelectorAll('body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > page-centered-layout:nth-child(3) > div > div > div.main-content > row-card:nth-child(2) > profile-section > section-card > mat-card > div.section-content-wrapper > div > fields-card:nth-child(5) > ul > li > field-formatter > link-formatter > a'), (el) => el.href)
      socialMeadias.forEach(el => {
        let label = el?.replace(/.+\/\/|www.|\..+/g, '')
        let value = el
        dataCompany.summary.details.socialMedias[label] = value;

      })
     return dataCompany;
    },
    dataCompany,
    i,
    url
  );


  try {

 
  
  
  await financialPage.goto(url + "/investor_financials", {
    waitUntil: "load",
    timeout: 0,
  });
 let newUrll = await financialPage.url();

  if(newUrll === url + '/investor_financials') {
    

    c = await financialPage.evaluate(

      
      
     async (dataCompany) => {
      function camelize(str) {
        return str
          ?.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index === 0 ? word?.toLowerCase() : word?.toUpperCase();
          })
          ?.replace(/\s+/g, "");
      }

        const rows = document?.querySelectorAll("row-card");

        const filteredRows = [];
        rows?.forEach((item) => {
          if (
            !item?.querySelector("h2")?.innerText.includes("Sub-Organizations")
          ) {
            filteredRows.push(item);
          } else {
          }
        });
        let newRows = [...new Set(filteredRows)];

        newRows.forEach((row) => {
          const tableRows = row?.querySelectorAll("tbody tr");
          const blockTitle = camelize(
            row?.querySelector(".section-title")?.innerText || ""
          );

          dataCompany.summary.financials[blockTitle] = {};

          const items = document.querySelectorAll("anchored-values a");

          items.forEach((item) => {
            const label = item?.querySelector("label-with-info")?.innerText;
            const value = item?.querySelector("field-formatter")?.innerText;
            dataCompany.summary.financials[camelize(label)] = value;
          });

          //Big Values
          let bigValues = row?.querySelectorAll("big-values-card div");
          let description =
            row?.querySelector("phrase-list-card")?.innerText || "";

          bigValues.forEach((element) => {
            let label =
              element?.querySelector("label-with-info")?.innerText || "";
            let info =
              element?.querySelector("field-formatter")?.innerText || "";
            label = camelize(label);

            dataCompany.summary.financials[blockTitle][label] = info;
          });
          dataCompany.summary.financials[blockTitle].description = description;

          //Details

          const textValueContent = row?.querySelectorAll(
            "ul.text_and_value li"
          );

          textValueContent?.forEach((elem) => {
            let label =
              elem?.querySelector(".wrappable-label-with-info")?.innerText ||
              "";
            const value =
              elem?.querySelector("field-formatter")?.innerText || "";

            label = camelize(label);

            dataCompany.summary.financials[blockTitle][label] = value;
          });

          const tableHead = row?.querySelectorAll("thead th");
          const headers = [];

          tableHead?.forEach((elem) => {
            const label = camelize(
              elem?.querySelector("label-with-info")?.innerText
            );
            headers.push(label);
          });
          let table = [];
          tableRows?.forEach((elem) => {
            const cells = elem?.querySelectorAll("td");
            const obj = {};
            cells.forEach((cell, i) => {
              obj[headers[i]] = cell.innerText;
            });

            table.push(obj);
          });
          dataCompany.summary.financials[blockTitle].table = table;
        });
        return dataCompany
      },
      c
    );
   
 
  }
  
  
} catch (e) {

    
  } finally {
    
  

 
  
 

  await page.goto(url + '/recent_investments', { waitUntil: "load", timeout: 0 });

  const newUrl = await page.url();

  if(newUrl != url + '/recent_investments') {
    return c
  } else {
   
    c = await page.evaluate((dataCompany) => {
      function camelize(str) {
        return str
          ?.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
            return index === 0 ? word?.toLowerCase() : word?.toUpperCase();
          })
          ?.replace(/\s+/g, "");
      }

      const rows = document.querySelectorAll("row-card");

      let newRows = [...new Set(rows)];

      newRows?.forEach((row) => {
        const tableRows = row?.querySelectorAll("tbody tr");
        const blockTitle = camelize(
          row?.querySelector(".section-title")?.innerText || ""
        );

        dataCompany.summary.investments[blockTitle] = {};

        const items = document?.querySelectorAll("anchored-values a");

        items?.forEach((item) => {
          const label = item?.querySelector("label-with-info")?.innerText;
          const value = item?.querySelector("field-formatter")?.innerText;
          dataCompany.summary.investments.highlights[camelize(label)] = value;
        });

        //Big Values
        let bigValues = row?.querySelectorAll("big-values-card div");
        let description =
          row.querySelector("phrase-list-card")?.innerText || "";

        bigValues?.forEach((element) => {
          let label = element?.querySelector("label-with-info")?.innerText || "";
          let info = element?.querySelector("field-formatter")?.innerText || "";
          label = camelize(label);

          dataCompany.summary.investments[blockTitle][label] = info;
        });
        dataCompany.summary.investments[blockTitle].description = description;

        //Details

        const textValueContent = row?.querySelectorAll("ul.text_and_value li");

        textValueContent?.forEach((elem) => {
          let label =
            elem?.querySelector(".wrappable-label-with-info")?.innerText || "";
          const value = elem?.querySelector("field-formatter")?.innerText || "";

          label = camelize(label);

          dataCompany.summary.investments[blockTitle][label] = value;
        });

        const tableHead = row?.querySelectorAll("thead th");
        const headers = [];

        tableHead?.forEach((elem) => {
          const label = camelize(
            elem?.querySelector("label-with-info")?.innerText
          );
          headers.push(label);
        });
        let table = [];
        tableRows?.forEach((elem) => {
          const cells = elem?.querySelectorAll("td");
          const obj = {};
          cells.forEach((cell, i) => {
            obj[headers[i]] = cell.innerText;
          });

          table.push(obj);
        });
        dataCompany.summary.investments[blockTitle].table = table;
      });

    

      return dataCompany;
     
       }, c );



    let textValueContent =  await page.evaluate(() => Array.from(
      document?.querySelectorAll('body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > page-centered-layout:nth-child(3) > div > div > div.main-content > row-card:nth-child(1) > profile-section > section-card > mat-card > div.section-content-wrapper > div > list-card > div > table > tbody > tr > td:nth-child(2) > field-formatter > identifier-formatter > a')
      ,
    (element) => element?.href.toString()
  ));
  
    let newTextValueContent = [...new Set(textValueContent)];


  
    for (let i = 0; i < newTextValueContent.length; i++) {
      await companyPage.goto(newTextValueContent[i], { timeout: 0 });
      console.log(newTextValueContent[i]);

  
      c = await companyPage.evaluate(async (dataCompany) => {
        function camelize(str) {
          return str
            ?.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
              return index === 0 ? word?.toLowerCase() : word?.toUpperCase();
            })
            ?.replace(/\s+/g, "");
        }
  
        let data = {
          about: {},
          details: {
            socialMedias: {}
          },
        };
        //About
        let companyName =
          document?.querySelector(
            "body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > profile-header > div > header > div > div > div > div.identifier-nav > div.identifier-nav-title.ng-star-inserted > h1"
          )?.innerText || "";
  
        const container1 = document?.querySelectorAll(".one-of-many-section")[0];
        const description = container1?.querySelector(
          "profile-section mat-card .description"
        )?.innerText;
        const infoList = container1?.querySelectorAll("ul li");
        const cdk = document?.querySelector(".cdk-describedby-message-container");
  
        data["companyName"] = companyName;
  
        infoList?.forEach((elem) => {
          try {
            let label = elem?.querySelector("field-formatter")?.innerText;
            const altClass = elem
              ?.querySelector("theme-icon")
              ?.getAttribute("aria-describedby");
            const altLabel = cdk?.querySelector(`#${altClass}`)?.innerHTML;
            data.about[camelize(altLabel)] = label;
          } catch (e) {
            console.log(e);
          }
        });
  
        data.description = description;
  
        // Details
        const mainContent = document?.querySelector(".main-content");
        const expDescription = document?.querySelectorAll(
          "description-card > div"
        )[1];
        
        const textValueContent = mainContent?.querySelectorAll(
          "ul.text_and_value li"
        );
  
        
        textValueContent?.forEach((elem) => {
          let label = elem?.querySelector(
            ".wrappable-label-with-info"
          )?.innerText;
          let value = elem?.querySelector("field-formatter")?.innerText;
  
          label = camelize(label);
         
  
          if(label === 'industries') {
               value = value?.split('\n');
          }
         
  
          data.details[label] = value;
        });
        try {
          expDescription.classList.add("expanded");
          data.details.description = expDescription?.innerText;
        } catch (e) {}
  
        //Social MEdias
       const socialMeadias =  Array.from(document?.querySelectorAll('body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > page-centered-layout:nth-child(3) > div > div > div.main-content > row-card:nth-child(2) > profile-section > section-card > mat-card > div.section-content-wrapper > div > fields-card:nth-child(5) > ul > li > field-formatter > link-formatter > a'), (el) => el?.href)
       socialMeadias?.forEach(el => {
         let label = el?.replace(/.+\/\/|www.|\..+/g, '')
         let value = el
         data.details.socialMedias[label] = value;
  
       })
  
        dataCompany.summary.listOfInvesmentCompanyInfo.push(data);
  
  
        
  
        return dataCompany;
      }, c);
  
    }
  
    console.log(c, "C");
  return c;
  
  
  }
}

};

scrape().then((value) => {
  console.log(value);
});

/*

const start = async () => {
  let data = JSON.parse(await fs.readFileSync('./crunchbase/crunchbase-investors-data-1/dataOne.json'));
  console.log(data)
  data.push(dataOne);

  fs.writeFileSync('./crunchbase/crunchbase-investors-data-1/dataOne.json', JSON.stringify(data,null, 2));

  
}

*/

/*

document.querySelectorAll('body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > page-centered-layout:nth-child(3) > div > div > div.main-content > row-card:nth-child(1) > profile-section > section-card > mat-card > div.section-content-wrapper > div > list-card > div > table > tbody > tr > td:nth-child(2) > field-formatter > identifier-formatter > a')
 */

//socail medias

/*
document.querySelectorAll('body > chrome > div > mat-sidenav-container > mat-sidenav-content > div > ng-component > entity-v2 > page-layout > div > div > div > page-centered-layout:nth-child(3) > div > div > div.main-content > row-card:nth-child(2) > profile-section > section-card > mat-card > div.section-content-wrapper > div > fields-card:nth-child(5) > ul > li')
*/
