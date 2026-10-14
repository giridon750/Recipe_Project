const FAVORITES_KEY = "tasty-bite-favorites";

// One localStorage list keeps homepage and Favorites page controls in sync.
function readFavorites() {
    try {
        const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
        // Keep favorites saved before the folder reorganization pointing at their new image folder.
        return Array.isArray(saved)
            ? saved.map((recipe) => ({
                ...recipe,
                image: `../assets/images/${recipe.image.split("/").pop()}`
            }))
            : [];
    } catch {
        return [];
    }
}

function writeFavorites(favorites) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        return true;
    } catch {
        return false;
    }
}

function recipeFromCard(card) {
    return {
        id: card.dataset.id,
        name: card.dataset.name,
        description: card.dataset.description,
        image: card.dataset.image,
        category: card.dataset.category,
        time: card.dataset.time
    };
}

// Keep each heart's accessible label and pressed state aligned with storage.
function updateFavoriteButton(button, isFavorite) {
    const icon = button.querySelector("i");
    const label = button.querySelector("[data-favorite-label]");
    const recipeName = button.closest("[data-recipe]").dataset.name;

    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute("aria-label", `${isFavorite ? "Remove" : "Add"} ${recipeName} ${isFavorite ? "from" : "to"} favorites`);
    icon.classList.toggle("fa-solid", isFavorite);
    icon.classList.toggle("fa-regular", !isFavorite);

    if (label) {
        label.textContent = isFavorite ? "Added to Favorites" : "Add to Favorites";
        button.classList.toggle("bg-emerald-900", !isFavorite);
        button.classList.toggle("hover:bg-emerald-800", !isFavorite);
        button.classList.toggle("text-white", !isFavorite);
        button.classList.toggle("bg-rose-50", isFavorite);
        button.classList.toggle("text-rose-700", isFavorite);
    }
}

// Render saved recipe values as text instead of interpreting them as markup.
function renderFavorites() {
    const grid = document.querySelector("#favorites-grid");
    const emptyState = document.querySelector("#favorites-empty");
    const template = document.querySelector("#favorite-card-template");
    if (!grid || !emptyState || !template) return;

    const favorites = readFavorites();
    grid.replaceChildren();
    emptyState.classList.toggle("hidden", favorites.length > 0);

    favorites.forEach((recipe) => {
        const card = template.content.firstElementChild.cloneNode(true);
        const image = card.querySelector("[data-image]");
        image.src = recipe.image;
        image.alt = recipe.name;
        card.querySelector("[data-category]").textContent = recipe.category;
        card.querySelector("[data-name]").textContent = recipe.name;
        card.querySelector("[data-description]").textContent = recipe.description;
        card.querySelector("[data-time]").textContent = recipe.time;
        card.querySelector("[data-remove]").addEventListener("click", () => {
            writeFavorites(readFavorites().filter((savedRecipe) => savedRecipe.id !== recipe.id));
            renderFavorites();
        });
        grid.append(card);
    });
}

function initializeRecipeHearts() {
    const favorites = readFavorites();
    document.querySelectorAll("[data-recipe]").forEach((card) => {
        const button = card.querySelector("[data-favorite-toggle]");
        if (!button) return;

        updateFavoriteButton(button, favorites.some((recipe) => recipe.id === card.dataset.id));
        button.addEventListener("click", () => {
            const current = readFavorites();
            const isFavorite = current.some((recipe) => recipe.id === card.dataset.id);
            const next = isFavorite
                ? current.filter((recipe) => recipe.id !== card.dataset.id)
                : [...current, recipeFromCard(card)];

            if (writeFavorites(next)) {
                updateFavoriteButton(button, !isFavorite);
                renderFavorites();
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeRecipeHearts();
    renderFavorites();
});
