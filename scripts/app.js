var exchangeJSON;
var salesJSON;
var salesPerson;
var salesPersonStats;
var startDate;
var stopDate;

// listen for changes in date range and set it to variables
let getStartDate = document.getElementById("start-date").addEventListener("input", () => {
    startDate = document.getElementById("start-date").value;
})
let getStopDate = document.getElementById("stop-date").addEventListener("input", () => {
    stopDate = document.getElementById("stop-date").value;
})

function createTable() {
    return new Promise((resolve) => {
        let newElement;
        let tableElements = document.querySelector("tbody");
        while (tableElements.firstChild) {
            tableElements.removeChild(tableElements.firstChild);
        }
        for (let i = 0; i < salesPersonStats.length; i++) {

            newElement = document.createElement("tr");
            newElement.setAttribute("id", `table-row-${i}`);
            document.querySelector("tbody").append(newElement);

            newElement = document.createElement("td");
            newElement.innerText = salesPersonStats[i].name;
            document.querySelector(`#table-row-${i}`).append(newElement);

            newElement = document.createElement("td");
            newElement.innerText = salesPersonStats[i].totalSales;
            document.querySelector(`#table-row-${i}`).append(newElement);

            resolve("complete");
        }
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
            convertUSDtoGBP(salesJSON, exchangeJSON)
                .then(() => {
                    return getSalesPerson(salesJSON)
                })
                .then(() => {
                    return salesPersonTotals(salesJSON, salesPerson)
                })
                .then(() => {
                    return createTable()
                })
        }
    })
})
// iterate through all sales orders and create an array of unique sales people
function getSalesPerson(salesJSON) {
    return new Promise((resolve) => {
        salesPerson = [];
        for (let i = 0; i < salesJSON.data.length; i++) {
            if (!salesPerson.includes(salesJSON.data[i].Salesperson)) {
                salesPerson.push(salesJSON.data[i].Salesperson);
            }
        }
        console.log(salesPerson);
        resolve("complete");
    })
}
// look for USD transactions and convert to GBP based on the exchange rate for that day
function convertUSDtoGBP(results, exchangeJSON) {
    return new Promise((resolve, reject) => {
        let exchangeRateOnDay;
        for (let i = 0; i < results.data.length; i++) {
            if (results.data[i].Currency == "USD") {
                try {
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
                if (!Number.isNaN(results.data[i]["Company Currency Total"]) & !Number.isNaN(exchangeRateOnDay)) {
                    results.data[i]["Company Currency Total"] = (results.data[i]["Company Currency Total"] / exchangeRateOnDay);
                }
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
    return new Promise((resolve) => {
        salesPersonStats = [];
        for (let i = 0; i < salesPerson.length; i++) {
            try {
                salesPersonStats[i] = { name: "", totalSales: 0 };
                salesPersonStats[i].name = salesPerson[i];
                let total = 0;
                for (let j = 0; j < salesJSON.data.length; j++) {
                    compareDates(salesJSON.data[j]["Creation Date"])
                    if (
                        salesJSON.data[j].Salesperson == salesPerson[i] &
                        !Number.isNaN(salesJSON.data[j]["Company Currency Total"]) &
                        salesJSON.data[j].Status == "Sales Order" &
                        compareDates(salesJSON.data[j]["Creation Date"])
                    ) {
                        total += salesJSON.data[j]["Company Currency Total"];
                    }
                }
                salesPersonStats[i].totalSales = total;
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
    try {
        let value = parseInt(comparisonDate.slice(0, 10).replaceAll("-", "0"));
        let min = parseInt(startDate.replaceAll("-", "0"));
        let max = parseInt(stopDate.replaceAll("-", "0"));
        if (value >= min & value <= max) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}