package main

import (
	"encoding/json"
	"net/http"
	"strconv"
)

type Task struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

func getTasksHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	rows, err := db.Query(
		"SELECT id, user_id, title, status, created_at FROM tasks WHERE user_id = ? ORDER BY id",
		userID,
	)
	if err != nil {
		http.Error(w, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	taskList := []Task{}
	for rows.Next() {
		var t Task
		if err := rows.Scan(&t.ID, &t.UserID, &t.Title, &t.Status, &t.CreatedAt); err != nil {
			http.Error(w, "Failed to read tasks", http.StatusInternalServerError)
			return
		}
		taskList = append(taskList, t)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"tasks": taskList})
}

func createTaskHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	var body struct {
		Title  string `json:"title"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if body.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}
	if body.Status == "" {
		body.Status = "pending"
	}

	result, err := db.Exec(
		"INSERT INTO tasks (user_id, title, status) VALUES (?, ?, ?)",
		userID, body.Title, body.Status,
	)
	if err != nil {
		http.Error(w, "Failed to create task", http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	var task Task
	db.QueryRow(
		"SELECT id, user_id, title, status, created_at FROM tasks WHERE id = ?", id,
	).Scan(&task.ID, &task.UserID, &task.Title, &task.Status, &task.CreatedAt)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{"task": task})
}

func getSingleTaskHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	var task Task
	err = db.QueryRow(
		"SELECT id, user_id, title, status, created_at FROM tasks WHERE id = ? AND user_id = ?",
		id, userID,
	).Scan(&task.ID, &task.UserID, &task.Title, &task.Status, &task.CreatedAt)
	if err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"task": task})
}

func updateTaskHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	var body struct {
		Title  string `json:"title"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	result, err := db.Exec(`
		UPDATE tasks
		SET title  = COALESCE(NULLIF(?, ''), title),
		    status = COALESCE(NULLIF(?, ''), status)
		WHERE id = ? AND user_id = ?
	`, body.Title, body.Status, id, userID)
	if err != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	var task Task
	db.QueryRow(
		"SELECT id, user_id, title, status, created_at FROM tasks WHERE id = ?", id,
	).Scan(&task.ID, &task.UserID, &task.Title, &task.Status, &task.CreatedAt)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"task": task})
}

func deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userIDKey).(int)

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid task ID", http.StatusBadRequest)
		return
	}

	result, err := db.Exec("DELETE FROM tasks WHERE id = ? AND user_id = ?", id, userID)
	if err != nil {
		http.Error(w, "Failed to delete task", http.StatusInternalServerError)
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
