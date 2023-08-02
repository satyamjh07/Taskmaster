// Task Class
class Task {
  constructor(id, task, priority, category, endTime, notes) {
    this.id = id;
    this.task = task;
    this.priority = priority;
    this.category = category;
    this.endTime = endTime;
    this.notes = notes;
  }
}
// UI Class
class UI {
  static displayTasks() {
    // Updated code to use IndexedDB
    const request = indexedDB.open("taskDatabase", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("tasks", { keyPath: "id" });
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("tasks", "readonly");
      const objectStore = transaction.objectStore("tasks");
      const getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = (event) => {
        const tasks = event.target.result;
        tasks.forEach((task) => UI.addTaskToList(task));
      };
    };

    request.onerror = (event) => {
      console.error("Error opening database:", event.target.error);
    };
  }
  static addTaskToList(task) {
    const taskList = document.getElementById("task-list");
    const existingTaskItem = taskList.querySelector(`[data-id="${task.id}"]`);

    if (existingTaskItem) {
      const taskTitle = existingTaskItem.querySelector(".task-title");
      const taskDetails = existingTaskItem.querySelector(".task-details");
      if (taskTitle && taskDetails) {
        taskTitle.innerText = task.task;
        taskDetails.innerText = `Priority: ${task.priority} - Category: ${task.category} - End Time: ${task.endTime}`;
      }
    } else {
      const taskItem = document.createElement("div");
      taskItem.className = "task";
      taskItem.innerHTML = `
        <div class="checkbox-container">
          <input type="checkbox" ${task.completed ? "checked" : ""}>
        </div>
        <div class="details">
          <h1 class="task-title"><strong>${task.task}</strong></h1>
          <p class="task-details">Priority: ${task.priority} - Category: ${
        task.category
      } - End Time: ${task.endTime}</p>
        </div>
        <div>
          <button class="edit-button" data-id="${task.id}">Edit</button>
          <button class="delete-button" data-id="${task.id}">Delete</button>
        </div>
      `;

      // Add event listener for checkbox
      const checkbox = taskItem.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", (event) => {
        const taskTitle = taskItem.querySelector(".task-title");
        if (event.target.checked) {
          taskTitle.classList.add("completed");
        } else {
          taskTitle.classList.remove("completed");
        }
        // Update the completion status in the IndexedDB
        task.completed = event.target.checked;
        Store.updateTask(task)
          .then(() => {
            // Call displaySortedTasks after updating the task
            UI.displaySortedTasks();
          })
          .catch((error) => {
            UI.showAlert("Error updating task:", "error");
          });
      });

      taskList.appendChild(taskItem);
    }
  }

  static displaySortedTasks() {
    const taskList = document.getElementById("task-list");
    taskList.innerHTML = ""; // Clear existing task list

    // Get tasks from IndexedDB
    Store.getTasks((tasks) => {
      // Separate completed and incomplete tasks
      const completedTasks = tasks.filter((task) => task.completed);
      const incompleteTasks = tasks.filter((task) => !task.completed);

      // Sort incomplete tasks based on priority
      incompleteTasks.sort((a, b) => {
        if (a.priority === "High" && b.priority !== "High") return -1;
        if (a.priority !== "High" && b.priority === "High") return 1;
        if (a.priority === "Medium" && b.priority === "Low") return -1;
        if (a.priority === "Low" && b.priority === "Medium") return 1;
        return 0;
      });

      // Sort completed tasks based on priority
      completedTasks.sort((a, b) => {
        if (a.priority === "High" && b.priority !== "High") return 1;
        if (a.priority !== "High" && b.priority === "High") return -1;
        if (a.priority === "Medium" && b.priority === "Low") return 1;
        if (a.priority === "Low" && b.priority === "Medium") return -1;
        return 0;
      });

      // Combine and display tasks in the correct order
      const sortedTasks = incompleteTasks.concat(completedTasks);
      sortedTasks.forEach((task) => UI.addTaskToList(task));
    });
  }

  static clearForm() {
    document.getElementById("task-form").reset();
  }

  static closeEditModal() {
    document.getElementById("edit-modal").style.display = "none";
  }

  static showAlert(message, type) {
    const customAlert = document.getElementById("custom-alert");
    const customAlertMessage = document.getElementById("custom-alert-message");

    customAlertMessage.innerText = message;

    if (type === "success") {
      customAlert.style.backgroundColor = "#28a745";
    } else if (type === "error") {
      customAlert.style.backgroundColor = "#dc3545";
    } else if (type === "dark") {
      customAlert.style.backgroundColor = "black";
    }

    customAlert.classList.add("show");

    setTimeout(() => {
      customAlert.classList.remove("show");
    }, 3000);
  }

  static editTask(task) {
    const taskList = document.getElementById("task-list");
    const taskItem = taskList.querySelector(`[data-id="${task.id}"]`);
    if (taskItem) {
      const taskTitle = taskItem.querySelector(".task-title");
      const taskDetails = taskItem.querySelector(".task-details");
      if (taskTitle && taskDetails) {
        taskTitle.innerText = task.task;
        taskDetails.innerText = `Priority: ${task.priority} - Category: ${task.category} - End Time: ${task.endTime}`;
        // Call displaySortedTasks after editing the task
        UI.displaySortedTasks();
        taskList.appendChild(taskItem);
      }
    }
  }

  static editTaskModal(task) {
    const modal = document.getElementById("edit-modal");
    if (modal) {
      document.getElementById("edit-task-id").value = task.id;
      document.getElementById("edit-task").value = task.task;
      document.getElementById("edit-priority").value = task.priority;
      document.getElementById("edit-category").value = task.category;
      document.getElementById("edit-endTime").value = task.endTime;
      document.getElementById("edit-notes").value = task.notes;
      modal.style.display = "block";
    }
  }
}

// Store Class (Updated to use IndexedDB)
class Store {
  static getDatabaseInstance(callback) {
    const request = indexedDB.open("taskDatabase", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("tasks", { keyPath: "id" });
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      callback(db);
    };

    request.onerror = (event) => {
      console.error("Error opening database:", event.target.error);
    };
  }

  static openDatabaseAndExecute(callback, mode = "readonly") {
    this.getDatabaseInstance((db) => {
      const transaction = db.transaction("tasks", mode);
      const objectStore = transaction.objectStore("tasks");
      callback(objectStore);
    });
  }

  static getTasks(callback) {
    this.openDatabaseAndExecute((objectStore) => {
      const getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = (event) => {
        const tasks = event.target.result;
        if (callback && typeof callback === "function") {
          callback(tasks);
        }
      };
    });
  }

  static addTask(task) {
    this.openDatabaseAndExecute((objectStore) => {
      objectStore.add(task);
    }, "readwrite");
  }

  static updateTask(task) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("taskDatabase", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore("tasks", { keyPath: "id" });
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction("tasks", "readwrite");
        const objectStore = transaction.objectStore("tasks");
        const updateRequest = objectStore.put(task);

        updateRequest.onsuccess = () => {
          resolve(); // Resolve the promise when the update is successful
        };

        updateRequest.onerror = (event) => {
          reject(event.target.error); // Reject the promise on error
        };

        transaction.oncomplete = () => {
          // Call displaySortedTasks after the transaction is complete
          UI.displaySortedTasks();
        };
      };

      request.onerror = (event) => {
        console.error("Error opening database:", event.target.error);
        reject(event.target.error); // Reject the promise on error
      };
    });
  }
  static removeTask(id) {
    this.openDatabaseAndExecute((objectStore) => {
      objectStore.delete(id);
    }, "readwrite");
  }
}

// Event: Display Tasks
document.addEventListener("DOMContentLoaded", UI.displaySortedTasks);

// Event: Add Task
document.getElementById("task-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const task = document.getElementById("task").value;
  const priority = document.getElementById("priority").value;
  const category = document.getElementById("category").value;
  const endTime = document.getElementById("endTime").value;
  const notes = document.getElementById("notes").value;

  if (task === "" || priority === "" || endTime === "") {
    UI.showAlert("Please fill in required fields.", "error");
    return;
  }

  const id = Date.now().toString();
  const newTask = new Task(id, task, priority, category, endTime, notes);

  UI.addTaskToList(newTask);
  Store.addTask(newTask);
  UI.clearForm();
  UI.showAlert("Task added successfully.", "success");
});

// Event: Edit Task - Save Changes
document.getElementById("edit-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("edit-task-id").value;
  const task = document.getElementById("edit-task").value;
  const priority = document.getElementById("edit-priority").value;
  const category = document.getElementById("edit-category").value;
  const endTime = document.getElementById("edit-endTime").value;
  const notes = document.getElementById("edit-notes").value;

  if (task === "" || priority === "" || endTime === "") {
    UI.showAlert("Please fill in required fields.", "error");
    return;
  }

  const updatedTask = new Task(id, task, priority, category, endTime, notes);

  UI.showAlert("Task updated successfully.", "success");
  UI.clearForm();
  UI.closeEditModal();
  UI.editTask(updatedTask); // Update the task in the task list
  Store.updateTask(updatedTask); // Update the task in the IndexedDB
});

// Event: Close Edit Modal
document.getElementById("close-modal").addEventListener("click", () => {
  UI.closeEditModal();
});

// Event: Delete Task
document.getElementById("task-list").addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-button")) {
    const taskId = e.target.getAttribute("data-id");
    Store.removeTask(taskId);
    e.target.parentElement.parentElement.remove();
    UI.showAlert("Task deleted successfully.", "error");
  }
});
// Event: Delete Task
document.getElementById("task-list").addEventListener("click", (e) => {
  if (e.target.classList.contains("edit-button")) {
    const taskId = e.target.getAttribute("data-id");
    Store.getTasks((tasks) => {
      const task = tasks.find((t) => t.id === taskId);
      Store.removeTask(taskId);
      UI.editTaskModal(task);
    });
  }
});

// Function to toggle dark mode
function toggleDarkMode() {
  const DarkMode = document.getElementById("toggle-dark-mode");
  const container = document.querySelector(".container");
  if (DarkMode.innerHTML === "Toggle Dark Mode") {
    document.documentElement.style.setProperty("--primary-color", "#000C66");
    document.documentElement.style.setProperty("--secondary-color", "#FA26A0");
    document.documentElement.style.setProperty("--bg-color", "#050A30");
    document.documentElement.style.setProperty("--text-color", "cyan");
    DarkMode.innerHTML = "Toggle Light Mode";
    DarkMode.title = "Enable Light Color"
    UI.showAlert("Dark Mode Enabled", "dark");
  } else {
    document.documentElement.style.setProperty("--primary-color", "#007bff");
    document.documentElement.style.setProperty("--secondary-color", "#0056b3");
    document.documentElement.style.setProperty("--bg-color", "#f0f0f0");
    document.documentElement.style.setProperty("--text-color", "#555");
    DarkMode.innerHTML = "Toggle Dark Mode";
    UI.showAlert("Light Mode Enabled", "success");
  }
}

// Function to show the modal accordion
function showAboutModal() {
  const modalContainer = document.getElementById("modal-container");
  modalContainer.style.display = "flex";
}

// Function to hide the modal accordion
function hideAboutModal() {
  const modalContainer = document.getElementById("modal-container");
  modalContainer.style.display = "none";
}

function toggleNavbar() {
  const navbar = document.querySelector(".navbar");
  navbar.classList.toggle("collapsed");
}

// Toggle navbar for mobile view
function toggleNavbar() {
  const navbarLinks = document.querySelector(".navbar-links");
  navbarLinks.classList.toggle("collapsed");
}

// Show/hide "Add Task" menu when button is clicked
document.getElementById("toggle-add-task").addEventListener("click", () => {
  const addTaskContainer = document.querySelector(".left-panel");
  addTaskContainer.style.display =
    addTaskContainer.style.display === "none" ? "block" : "none";
});

// Attach event listeners
document
  .getElementById("toggle-dark-mode")
  .addEventListener("click", toggleDarkMode);
document
  .getElementById("about-button")
  .addEventListener("click", showAboutModal);
document
  .getElementById("close-button")
  .addEventListener("click", hideAboutModal);

// Attach event listener to the toggle-dark-mode button
document
  .getElementById("toggle-dark-mode")
  .addEventListener("click", toggleDarkMode);
