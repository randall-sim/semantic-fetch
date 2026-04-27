package main

import (
	"fmt"
	"net/http"
)

func main() {
	initDB()
	defer db.Close()

	mux := http.NewServeMux()

	// Public auth routes
	mux.HandleFunc("POST /auth/register", registerHandler)
	mux.HandleFunc("POST /auth/login", loginHandler)

	// Protected task routes — all require a valid JWT
	mux.Handle("GET /tasks", jwtMiddleware(http.HandlerFunc(getTasksHandler)))
	mux.Handle("POST /tasks", jwtMiddleware(http.HandlerFunc(createTaskHandler)))
	mux.Handle("GET /tasks/{id}", jwtMiddleware(http.HandlerFunc(getSingleTaskHandler)))
	mux.Handle("PUT /tasks/{id}", jwtMiddleware(http.HandlerFunc(updateTaskHandler)))
	mux.Handle("DELETE /tasks/{id}", jwtMiddleware(http.HandlerFunc(deleteTaskHandler)))

	fmt.Println("Server is running on port 8080...")
	if err := http.ListenAndServe(":8080", corsMiddleware(mux)); err != nil {
		fmt.Printf("Error starting server: %s\n", err)
	}
}
