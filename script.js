function fetchWebStatus() {
    fetch('http://localhost:3000/status')
    .then(response => response.json())
    .then(data => {
        const tableBody = document.getElementById('web-status-table')
        tableBody.innerHTML = ""
        for (const url in data) {
            const row = document.createElement('tr')
            const webCell = document.createElement('td')
            const statusCell = document.createElement('td')
            webCell.textContent = url
            statusCell.textContent = data[url]
            row.appendChild(webCell)
            row.appendChild(statusCell)
            tableBody.appendChild(row)
        }
    })
    .catch(error => console.error('Error fetching web status:', error))
}

setInterval(fetchWebStatus, 30000)
fetchWebStatus()