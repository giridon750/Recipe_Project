const PLAN_STORAGE_KEY = "tasty-bite-weekly-plan";
const MEAL_NAMES = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snacks: "Snacks"
};
const MEAL_ICONS = {
    breakfast: "fa-mug-hot",
    lunch: "fa-bowl-food",
    dinner: "fa-moon",
    snacks: "fa-cookie-bite"
};

let recipes = [];
let plans = readPlan();
let weekDates = [];
let editingPlanId = null;

function readPlan() {
    try {
        const saved = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function writePlan() {
    try {
        localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
        return true;
    } catch {
        return false;
    }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getWeekDates() {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return date;
    });
}

function displayDate(date, options) {
    return new Intl.DateTimeFormat(undefined, options).format(date);
}

async function loadRecipes() {
    const message = document.querySelector("#recipe-load-message");
    const select = document.querySelector("#plan-recipe");

    try {
        const response = await fetch("favorites.html");
        if (!response.ok) throw new Error("Recipe list could not be loaded.");
        const pageText = await response.text();
        const recipeDocument = new DOMParser().parseFromString(pageText, "text/html");
        recipes = [...recipeDocument.querySelectorAll("[data-recipe]")].map((card) => ({
            id: card.dataset.id,
            name: card.dataset.name,
            description: card.dataset.description,
            image: card.dataset.image,
            category: card.dataset.category,
            time: card.dataset.time
        }));

        recipes.forEach((recipe) => {
            const option = document.createElement("option");
            option.value = recipe.id;
            option.textContent = `${recipe.name} · ${recipe.category}`;
            select.append(option);
        });
    } catch {
        message.textContent = "Recipes could not load right now. Check your connection and try again.";
        message.classList.remove("hidden");
        select.disabled = true;
    }
}

// Templates keep planner cards in the Tailwind scan while the grid adapts at each breakpoint.
function renderWeek() {
    const weekGrid = document.querySelector("#week-grid");
    const dayTemplate = document.querySelector("#day-template");
    const mealTemplate = document.querySelector("#planned-meal-template");
    const today = formatDate(new Date());

    weekGrid.replaceChildren();
    weekDates.forEach((date) => {
        const dateKey = formatDate(date);
        const dayCard = dayTemplate.content.firstElementChild.cloneNode(true);
        dayCard.querySelector("[data-day-name]").textContent = displayDate(date, { weekday: "long" });
        dayCard.querySelector("[data-day-date]").textContent = displayDate(date, { month: "short", day: "numeric" });
        dayCard.querySelector("[data-today-badge]").classList.toggle("hidden", dateKey !== today);
        if (dateKey === today) {
            dayCard.classList.add("border-orange-400", "ring-2", "ring-orange-200");
            dayCard.setAttribute("aria-current", "date");
        }

        dayCard.querySelectorAll("[data-meal-slot]").forEach((slot) => {
            const mealName = slot.dataset.mealSlot;
            const items = plans.filter((plan) => plan.date === dateKey && plan.meal === mealName);
            const itemContainer = slot.querySelector("[data-meal-items]");
            const addButton = slot.querySelector("[data-add-slot]");
            addButton.dataset.date = dateKey;
            addButton.dataset.meal = mealName;

            items.forEach((item) => {
                const recipe = recipes.find((savedRecipe) => savedRecipe.id === item.recipeId) || item.recipe;
                if (!recipe) return;
                const mealCard = mealTemplate.content.firstElementChild.cloneNode(true);
                const image = mealCard.querySelector("[data-recipe-image]");
                image.src = recipe.image;
                image.alt = recipe.name;
                mealCard.querySelector("[data-recipe-name]").textContent = recipe.name;
                mealCard.querySelector("[data-recipe-category]").textContent = recipe.category;
                mealCard.querySelector("[data-edit]").dataset.planId = item.id;
                mealCard.querySelector("[data-remove]").dataset.planId = item.id;
                itemContainer.append(mealCard);
            });
        });
        weekGrid.append(dayCard);
    });

    const firstDay = weekDates[0];
    const lastDay = weekDates[6];
    document.querySelector("#week-label").textContent = `${displayDate(firstDay, { month: "long", day: "numeric" })} – ${displayDate(lastDay, { month: "long", day: "numeric", year: "numeric" })}`;
    renderTodaySummary(today);
}

function renderTodaySummary(today) {
    const container = document.querySelector("#today-items");
    const emptyMessage = document.querySelector("#today-empty");
    const template = document.querySelector("#today-item-template");
    const todayMeals = plans.filter((plan) => plan.date === today);

    container.replaceChildren();
    emptyMessage.classList.toggle("hidden", todayMeals.length > 0);
    todayMeals.forEach((item) => {
        const recipe = recipes.find((savedRecipe) => savedRecipe.id === item.recipeId) || item.recipe;
        if (!recipe) return;
        const summaryItem = template.content.firstElementChild.cloneNode(true);
        summaryItem.querySelector("[data-meal-icon]").classList.add(...MEAL_ICONS[item.meal].split(" "));
        summaryItem.querySelector("[data-meal-name]").textContent = MEAL_NAMES[item.meal];
        summaryItem.querySelector("[data-recipe-name]").textContent = recipe.name;
        container.append(summaryItem);
    });
}

function openPlannerDialog({ date, meal, plan } = {}) {
    const dialog = document.querySelector("#planner-dialog");
    const form = document.querySelector("#meal-form");
    const dateSelect = document.querySelector("#plan-date");
    const mealSelect = document.querySelector("#plan-meal");
    const recipeSelect = document.querySelector("#plan-recipe");

    editingPlanId = plan?.id || null;
    document.querySelector("#dialog-title").textContent = plan ? "Edit planned meal" : "Add a meal";
    form.querySelector('[type="submit"]').textContent = plan ? "Update meal" : "Save meal";
    dateSelect.value = date || plan?.date || formatDate(new Date());
    mealSelect.value = meal || plan?.meal || "breakfast";
    recipeSelect.value = plan?.recipeId || "";
    dialog.showModal();
}

function saveMeal(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const recipe = recipes.find((item) => item.id === formData.get("recipe"));
    if (!recipe) return;

    const entry = {
        id: editingPlanId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date: formData.get("date"),
        meal: formData.get("meal"),
        recipeId: recipe.id,
        recipe
    };
    plans = editingPlanId
        ? plans.map((plan) => plan.id === editingPlanId ? entry : plan)
        : [...plans, entry];

    if (writePlan()) {
        document.querySelector("#planner-dialog").close();
        renderWeek();
    }
}

function handleWeekClick(event) {
    const addButton = event.target.closest("[data-add-slot]");
    const editButton = event.target.closest("[data-edit]");
    const removeButton = event.target.closest("[data-remove]");

    if (addButton) {
        openPlannerDialog({ date: addButton.dataset.date, meal: addButton.dataset.meal });
        return;
    }
    if (editButton) {
        openPlannerDialog({ plan: plans.find((plan) => plan.id === editButton.dataset.planId) });
        return;
    }
    if (removeButton) {
        plans = plans.filter((plan) => plan.id !== removeButton.dataset.planId);
        if (writePlan()) renderWeek();
    }
}

function clearPlan() {
    if (!plans.length || !window.confirm("Clear all meals from this weekly plan?")) return;
    plans = [];
    if (writePlan()) renderWeek();
}

document.addEventListener("DOMContentLoaded", async () => {
    weekDates = getWeekDates();
    const dateSelect = document.querySelector("#plan-date");
    weekDates.forEach((date) => {
        const option = document.createElement("option");
        option.value = formatDate(date);
        option.textContent = `${displayDate(date, { weekday: "long" })}, ${displayDate(date, { month: "short", day: "numeric" })}`;
        dateSelect.append(option);
    });

    await loadRecipes();
    renderWeek();
    document.querySelector("#week-grid").addEventListener("click", handleWeekClick);
    document.querySelector("[data-open-planner]").addEventListener("click", () => openPlannerDialog());
    document.querySelector("#clear-plan").addEventListener("click", clearPlan);
    document.querySelector("#meal-form").addEventListener("submit", saveMeal);
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
        button.addEventListener("click", () => document.querySelector("#planner-dialog").close());
    });
});
