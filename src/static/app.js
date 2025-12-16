document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to robustly escape attribute selectors
  function cssEscapeFallback(str) {
    if (window.CSS && CSS.escape) return CSS.escape(str);
    return str.replace(/["\\\n\r\t]/g, (c) => {
      return '\\' + c;
    });
  }

  // Update a single activity card in-place after a signup
  function updateActivityCard(name, participantEmail) {
    const selector = `.activity-card[data-activity-name="${cssEscapeFallback(name)}"]`;
    let card = document.querySelector(selector);

    // Fallback: match by h4 text if data attribute lookup fails
    if (!card) {
      const cards = Array.from(document.querySelectorAll(".activity-card"));
      card = cards.find((c) => {
        const h = c.querySelector("h4");
        return h && h.textContent.trim() === name;
      });
    }

    if (!card) return;

    const participantsDiv = card.querySelector(".participants");
    if (!participantsDiv) return;

    // If "No participants yet" placeholder exists, remove it and create ul
    const noPartEl = participantsDiv.querySelector(".no-participants");
    let ul = participantsDiv.querySelector(".participants-list");
    if (!ul) {
      ul = document.createElement("ul");
      ul.className = "participants-list";
      if (noPartEl) noPartEl.remove();
      participantsDiv.appendChild(ul);
    }

    // Append new participant
    const li = document.createElement("li");
    li.textContent = participantEmail;
    ul.appendChild(li);

    // Update spots left (clamp to 0)
    const spotsEl = card.querySelector(".spots-left");
    if (spotsEl) {
      const current = parseInt(spotsEl.textContent, 10);
      const next = Math.max(0, isNaN(current) ? 0 : current - 1);
      spotsEl.textContent = String(next);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // Make the card addressable
        activityCard.setAttribute("data-activity-name", name);

        const spotsLeft = details.max_participants - details.participants.length;

        // Basic card content (availability includes a span we can update)
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
        `;

        // Participants section (built with DOM methods to avoid injection)
        const participants = details.participants || [];
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const heading = document.createElement("h5");
        heading.textContent = "Participants:";
        participantsDiv.appendChild(heading);

        if (participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          participants.forEach((participant) => {
            const li = document.createElement("li");
            li.textContent = participant;
            ul.appendChild(li);
          });
          participantsDiv.appendChild(ul);
        } else {
          const p = document.createElement("p");
          p.className = "no-participants";
          p.textContent = "No participants yet";
          participantsDiv.appendChild(p);
        }

        activityCard.appendChild(participantsDiv);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = signupForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Immediately update the specific activity card (optimistic UI)
        updateActivityCard(activity, email);

        // Also refresh activities in the background to keep UI consistent
        fetchActivities().catch(() => {});
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    } finally {
      submitButton.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
