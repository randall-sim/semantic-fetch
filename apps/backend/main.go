package main

import (
	"fmt"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	// These handler functions are defined in tasks.go
	// Because they share the "main" package, main.go knows they exist!
	mux.HandleFunc("GET /tasks", getTasksHandler)
	mux.HandleFunc("POST /tasks", createTaskHandler)
	mux.HandleFunc("GET /tasks/{id}", getSingleTaskHandler)
	mux.HandleFunc("DELETE /tasks/{id}", deleteTaskHandler)

	fmt.Println("Server is running on port 8080...")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}