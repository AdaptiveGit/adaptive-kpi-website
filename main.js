var exchangeJSON;
var salesJSON;
var salesPerson;
var salesPersonStats;
var startDate;
var stopDate;

// only these salespeople's stats will be displayed
const salesPersonFilter = [
    "Chris Roney",
    "Jasjit Singh",
    "Amy Bonner-Davies",
    "Colin Thornback",
    "George Bartram"
];

// listen for changes in date range and set it to variables
let getStartDate = document.getElementById("start-date").addEventListener("input", () => {
    startDate = document.getElementById("start-date").value;
})
let getStopDate = document.getElementById("stop-date").addEventListener("input", () => {
    stopDate = document.getElementById("stop-date").value;
})

function createTableBody() {
    return new Promise((resolve) => {

        // check for existing elements and clear the table before inserting new elements
        let tableElements = document.querySelector("tbody");
        while (tableElements.firstChild) {
            tableElements.removeChild(tableElements.firstChild);
        }

        for (let i = 0; i < salesPersonStats.length; i++) {

            //create
            let newElement;
            let nf = Intl.NumberFormat();

            newElement = document.createElement("tr");
            newElement.setAttribute("id", `table-row-${i}`);
            document.querySelector("tbody").append(newElement);

            newElement = document.createElement("td");
            newElement.innerText = salesPersonStats[i].name;
            document.querySelector(`#table-row-${i}`).append(newElement);

            newElement = document.createElement("td");
            newElement.innerText = salesPersonStats[i].deals;
            document.querySelector(`#table-row-${i}`).append(newElement);

            newElement = document.createElement("td");
            newElement.innerText = `£${nf.format(parseInt(salesPersonStats[i].totalSales))}`;
            document.querySelector(`#table-row-${i}`).append(newElement);

            newElement = document.createElement("td");
            newElement.innerText = `£${nf.format(parseInt(salesPersonStats[i].prospectiveSales))}`;
            document.querySelector(`#table-row-${i}`).append(newElement);

            newElement = document.createElement("td");
            newElement.innerText = `£${nf.format(parseInt(salesPersonStats[i].averageOrderValue))}`;
            document.querySelector(`#table-row-${i}`).append(newElement);

            resolve("complete");
        }
    })
}

function createTableFoot() {
    return new Promise((resolve) => {

        // check for existing elements and clear the table before inserting new elements
        let tableElements = document.querySelector("tfoot");
        while (tableElements.firstChild) {
            tableElements.removeChild(tableElements.firstChild);
        }

        let Row = document.querySelector("tr");
        let rowElements = Row.children;

        let newElement;
        let nf = Intl.NumberFormat();
        let total = 0;

        newElement = document.createElement("tr");
        newElement.setAttribute("id", `table-foot`);
        document.querySelector("tfoot").append(newElement);

        newElement = document.createElement("td");
        newElement.innerText = "Total";
        document.querySelector(`#table-foot`).append(newElement);

        total = 0;
        for (let j = 0; j < salesPersonStats.length; j++) {
            total += salesPersonStats[j].deals;
        }

        newElement = document.createElement("td");
        newElement.innerText = nf.format(parseInt(total));
        document.querySelector(`#table-foot`).append(newElement);

        total = 0;
        for (let j = 0; j < salesPersonStats.length; j++) {
            total += salesPersonStats[j].totalSales;
        }

        newElement = document.createElement("td");
        newElement.innerText = `£${nf.format(parseInt(total))}`;
        document.querySelector(`#table-foot`).append(newElement);

        total = 0;
        for (let j = 0; j < salesPersonStats.length; j++) {
            total += salesPersonStats[j].prospectiveSales;
        }

        newElement = document.createElement("td");
        newElement.innerText = `£${nf.format(parseInt(total))}`;
        document.querySelector(`#table-foot`).append(newElement);

        total = 0;
        for (let j = 0; j < salesPersonStats.length; j++) {
            total += salesPersonStats[j].averageOrderValue;
        }

        newElement = document.createElement("td");
        newElement.innerText = `£${nf.format(parseInt(total))}`;
        document.querySelector(`#table-foot`).append(newElement);

        resolve("complete");
    })
}


// parse historical exchange rate data
let btnUploadExchange = document.getElementById("btn-upload-exchange-csv").addEventListener("click", () => {
    Papa.parse(document.getElementById("upload-exchange-csv").files[0], {
        download: true,
        header: true,
        complete: function (results) {
            exchangeJSON = results;
            document.getElementById("btn-upload-sales-csv").removeAttribute("disabled");
        }
    })
})

// parse KPI data
let btnUploadSales = document.getElementById("btn-upload-sales-csv").addEventListener("click", () => {
    Papa.parse(document.getElementById("upload-sales-csv").files[0], {
        download: true,
        header: true,
        complete: function (results) {
            salesJSON = results;
            try {
                document.querySelector(".table-hidden").removeAttribute("hidden");
                document.querySelector(".table-hidden").setAttribute("class", "table-visible");
            } catch (error) { }

            convertUSDtoGBP(salesJSON, exchangeJSON)
                .then(() => {
                    return getSalesPerson(salesJSON)
                })
                .then(() => {
                    return salesPersonTotals(salesJSON, salesPerson)
                })
                .then(() => {
                    return createTableBody()
                })
                .then(() => {
                    return createTableFoot()
                })
        }
    })
})

// iterate through all sales orders and create an array of unique sales people
function getSalesPerson(salesJSON) {

    // return a promise once function is completed
    return new Promise((resolve) => {
        salesPerson = [];

        // iterate through every sale
        for (let i = 0; i < salesJSON.data.length; i++) {

            // iterate through every salesperson in the filter and add them to the array if they are not already
            for (let j = 0; j < salesPersonFilter.length; j++) {
                if (!salesPerson.includes(salesJSON.data[i].Salesperson) & salesJSON.data[i].Salesperson == salesPersonFilter[j]) {
                    salesPerson.push(salesJSON.data[i].Salesperson);
                }
            }
        }
        console.log(salesPerson);
        resolve("complete");
    })
}

// look for USD transactions and convert to GBP based on the exchange rate for that day
function convertUSDtoGBP(results, exchangeJSON) {

    // return a promise once function is completed
    return new Promise((resolve, reject) => {
        let exchangeRateOnDay;

        // iterate through every transaction and isolate sales in USD
        for (let i = 0; i < results.data.length; i++) {
            if (results.data[i].Currency == "USD") {
                try {

                    // look for the relevant exchange rate on the date of sale - if it is not avalible then use the day before
                    let dateOfSale = results.data[i]["Creation Date"].slice(0, 10);
                    for (let j = 0; j < exchangeJSON.data.length; j++) {
                        if (exchangeJSON.data[j].DATE == dateOfSale) {
                            if (parseInt(exchangeJSON.data[j].DEXUSUK) > 0) {
                                exchangeRateOnDay = exchangeJSON.data[j].DEXUSUK;
                                break;
                            } else {
                                exchangeRateOnDay = exchangeJSON.data[j - 1].DEXUSUK;
                            }
                        }
                    }
                } catch (error) {
                    console.log(error);
                }

                // check to ensure exchange rate and transation totals are valid and convert USD to GBP
                if (!Number.isNaN(results.data[i]["Company Currency Total"]) & !Number.isNaN(exchangeRateOnDay)) {
                    results.data[i]["Company Currency Total"] = (results.data[i]["Company Currency Total"] / exchangeRateOnDay);
                }

                // if transaction is not in USD return value unchanged as a float    
            } else {
                results.data[i]["Company Currency Total"] = parseFloat(results.data[i]["Company Currency Total"]);
            }
        }
        salesJSON = results
        console.log(salesJSON);
        resolve("complete");
    })
}

// generate sales totals for each sales person
function salesPersonTotals(salesJSON, salesPerson) {

    // return a promise once function is completed
    return new Promise((resolve) => {
        salesPersonStats = [];
        for (let i = 0; i < salesPerson.length; i++) {
            try {

                // create objects and variables for stats
                salesPersonStats[i] = { name: "", totalSales: 0, prospectiveSales: 0, deals: 0, averageOrderValue: 0 };
                salesPersonStats[i].name = salesPerson[i];
                let totalSales = 0;
                let prospectiveSales = 0;
                let deals = 0;
                let averageOrderValue = 0;

                // iterate through sales data within the date limits
                for (let j = 0; j < salesJSON.data.length; j++) {
                    compareDates(salesJSON.data[j]["Creation Date"])

                    // split sales orders and quotations and total them
                    if (
                        salesJSON.data[j].Salesperson == salesPerson[i] &
                        !Number.isNaN(salesJSON.data[j]["Company Currency Total"]) &
                        salesJSON.data[j].Status == "Sales Order" &
                        compareDates(salesJSON.data[j]["Creation Date"])
                    ) {
                        totalSales += salesJSON.data[j]["Company Currency Total"];
                        deals++;
                    } else if (
                        salesJSON.data[j].Salesperson == salesPerson[i] &
                        !Number.isNaN(salesJSON.data[j]["Company Currency Total"]) &
                        salesJSON.data[j].Status == "Quotation Sent" &
                        compareDates(salesJSON.data[j]["Creation Date"])
                    ) {
                        prospectiveSales += salesJSON.data[j]["Company Currency Total"];
                    }
                }
                // check if average order value is valid and assign 0 if not
                averageOrderValue = (totalSales / deals);
                if (Number.isNaN(averageOrderValue)) {
                    averageOrderValue = 0;
                }
                // assign the totals for each sales person
                salesPersonStats[i].totalSales = totalSales;
                salesPersonStats[i].prospectiveSales = prospectiveSales;
                salesPersonStats[i].deals = deals;
                salesPersonStats[i].averageOrderValue = averageOrderValue;
            } catch (error) {
                console.log(error);
            }
        }
        console.log(salesPersonStats);
        resolve("complete");
    })
}

// check if date is within set bounds
function compareDates(comparisonDate) {

    // format the dates into a number
    try {
        let value = parseInt(comparisonDate.slice(0, 10).replaceAll("-", "0"));
        let min = parseInt(startDate.replaceAll("-", "0"));
        let max = parseInt(stopDate.replaceAll("-", "0"));

        // check if comparison date is within bounds
        if (value >= min & value <= max) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}