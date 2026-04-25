const profile = document.querySelector(".profile");

profile.addEventListener("click", () => {
    profile.classList.toggle("active");
});

function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById("theme-icon");

    body.classList.toggle("dark");

    if (body.classList.contains("dark")) {
        icon.src = "moon.png"; 
        localStorage.setItem("theme", "dark");
    } else {
        icon.src = "sun.png";
        localStorage.setItem("theme", "light");
    }
}

/* Load saved theme */
window.onload = function () {
    const savedTheme = localStorage.getItem("theme");
    const icon = document.getElementById("theme-icon");

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        icon.src = "moon.png";
    }
};

/* Active nav item */
function setActiveNavItem() {
    const currentPage = window.location.pathname.split("/").pop();

    document.querySelectorAll(".nav-item").forEach(link => {
        const linkPage = link.getAttribute("href").split("/").pop();

        if (linkPage === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

setActiveNavItem();

document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');

    if (!calendarEl) return;

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',

        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },

        events: [
            {
                title: 'Microscope Reserved',
                start: '2026-03-28',
                color: '#00e558'
            },
            {
                title: 'Chem Lab Equipment',
                start: '2026-03-29T10:00:00',
                end: '2026-03-29T12:00:00',
                color: '#4f7cff'
            },
            {
                title: 'Physics Lab Use',
                start: '2026-03-30',
                color: '#ffb800'
            }
        ]
    });

    calendar.render();
});

