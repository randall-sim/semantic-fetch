package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
)

// Task and DB variables
type Task struct {
	ID     int    `json:"id"`
	Title  string `json:"title"`
	Status string `json:"status"`
}

var (
	tasks  = make(map[int]Task)
	nextID = 1
	mu     sync.Mutex
)

// --- Handlers ---

// getTasksHandler returns all tasks
func getTasksHandler(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()

	taskList := make([]Task, 0, len(tasks))
	for _, task := range tasks {
		taskList = append(taskList, task)
	}

	response := struct {
		"tasks": []Task
	}{
		"tasks": taskList,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// createTaskHandler accepts JSON to create a new task
func createTaskHandler(w http.ResponseWriter, r *http.Request) {
	var newTask Task
	
	// Decode the request body into our struct
	if err := json.NewDecoder(r.Body).Decode(&newTask); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	mu.Lock()
	newTask.ID = nextID
	nextID++
	// Default status if none provided
	if newTask.Status == "" {
		newTask.Status = "pending"
	}
	tasks[newTask.ID] = newTask
	mu.Unlock()

	response := struct {
		"task": Task
	}{
		"task": newTask,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// getSingleTaskHandler fetches a single task by its path variable ID
func getSingleTaskHandler(w http.ResponseWriter, r *http.Request) {
	// Extract the {id} wildcard from the path
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	mu.Lock()
	task, exists := tasks[id]
	mu.Unlock()

	if !exists {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	response := struct {
		"task": Task
	}{
		"task": task,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// deleteTaskHandler removes a task by ID
func deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	if _, exists := tasks[id]; !exists {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	delete(tasks, id)
	w.WriteHeader(http.StatusNoContent) // 204 No Content for successful deletion
}