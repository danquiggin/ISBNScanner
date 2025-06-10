const isbnInput = document.getElementById("isbn");
const lookupBtn = document.getElementById("lookup");
const saveBtn = document.getElementById("save");
const exportBtn = document.getElementById("export");

const fields = {
    title: document.getElementById("title"),
    author: document.getElementById("author"),
    publisher: document.getElementById("publisher"),
    publish_date: document.getElementById("publish_date"),
    lccn: document.getElementById("lccn"),
    notes: document.getElementById("notes")
};

const bookForm = document.getElementById("book-form");
const recordsTable = document.querySelector("#records-table tbody");

let scannedBooks = [];

function clearForm() {
    for (const key in fields) {
        fields[key].value = "";
    }
}

function populateForm(data) {
    for (const key in fields) {
        fields[key].value = data[key] || "";
    }
}

function appendToTable(book) {
    const row = recordsTable.insertRow();
    row.insertCell().innerText = book.isbn;
    row.insertCell().innerText = book.title;
    row.insertCell().innerText = book.author;
    row.insertCell().innerText = book.publisher;
    row.insertCell().innerText = book.publish_date;
    row.insertCell().innerText = book.lccn;
    row.insertCell().innerText = book.notes;
}

async function lookupISBN(isbn) {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    try {
        const response = await fetch(url);
        const json = await response.json();
        const bookData = json[`ISBN:${isbn}`];

        if (!bookData) {
            alert("Book not found. You may enter data manually.");
            return {
                isbn: isbn,
                title: "",
                author: "",
                publisher: "",
                publish_date: "",
                lccn: "",
                notes: ""
            };
        }

        return {
            isbn: isbn,
            title: bookData.title || "",
            author: bookData.authors ? bookData.authors.map(a => a.name).join(", ") : "",
            publisher: bookData.publishers ? bookData.publishers.map(p => p.name).join(", ") : "",
            publish_date: bookData.publish_date || "",
            lccn: (bookData.identifiers?.lccn || []).join(", "),
            notes: ""
        };
    } catch (error) {
        console.error("Error fetching book data:", error);
        alert("Network error during lookup.");
        return {
            isbn: isbn,
            title: "",
            author: "",
            publisher: "",
            publish_date: "",
            lccn: "",
            notes: ""
        };
    }
}


function getEmptyBook() {
    return {
        title: "",
        author: "",
        publisher: "",
        publish_date: "",
        lccn: "",
        notes: ""
    };
}


isbnInput.addEventListener("keypress", async (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        const isbn = isbnInput.value.trim();
        if (!isbn.match(/^\d{10,13}$/)) {
            alert("Please enter a 10- or 13-digit ISBN.");
            return;
        }

        const bookData = await lookupISBN(isbn);
        populateForm(bookData);
        bookForm.style.display = "block";
    }
});

lookupBtn.addEventListener("click", async () => {
    const isbn = isbnInput.value.trim();
    const bookData = await lookupISBN(isbn);
    populateForm(bookData);
    bookForm.style.display = "block";
});

saveBtn.addEventListener("click", () => {
    const isbn = isbnInput.value.trim();

    const book = {
        isbn: isbn,
        title: fields.title.value.trim(),
        author: fields.author.value.trim(),
        publisher: fields.publisher.value.trim(),
        publish_date: fields.publish_date.value.trim(),
        lccn: fields.lccn.value.trim(),
        notes: fields.notes.value.trim()
    };

    scannedBooks.push(book);
    appendToTable(book);

    isbnInput.value = "";
    clearForm();
    bookForm.style.display = "none";
    isbnInput.focus();
});
window.onload = () => {
    isbnInput.focus();
};

exportBtn.addEventListener("click", () => {
    if (scannedBooks.length === 0) {
        alert("No books to export.");
        return;
    }

    const filename = prompt("Enter a file name for your export (without extension):", "scanned_books");
    if (!filename) return;

    // Human-readable headers
    const headers = [
        ["ISBN", "Title", "Author", "Publisher", "Publication Date", "LCCN", "Notes"]
    ];

    // Data rows
    const dataRows = scannedBooks.map(book => [
        book.isbn,
        book.title,
        book.author,
        book.publisher,
        book.publish_date,
        book.lccn,
        book.notes
    ]);

    const allData = headers.concat(dataRows);

    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Simulate autofit: calculate column widths
    const colWidths = headers[0].map((header, i) => {
        const maxLen = Math.max(
            header.length,
            ...dataRows.map(row => (row[i] ? row[i].toString().length : 0))
        );
        return { wch: maxLen + 2 };
    });

    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Books");

    const wbout = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
    });

    const blob = new Blob([wbout], { type: "application/octet-stream" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});



