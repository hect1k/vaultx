package main

import (
	"log"
	"vaultx-backend/internal/auth"
	"vaultx-backend/internal/db"
	"vaultx-backend/internal/files"
	"vaultx-backend/internal/middleware"
	"vaultx-backend/internal/models"

	"github.com/gofiber/fiber/v2"
)

func main() {
	db.ConnectDB()
	db.DB.AutoMigrate(&models.User{})

	app := fiber.New()

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"msg": "VaultX Backend Running"})
	})

	authGroup := app.Group("/auth")
	authGroup.Post("/register", auth.Register)
	authGroup.Post("/login", auth.Login)

	fileGroup := app.Group("/files")
	fileGroup.Post("/upload", middleware.Protect("user", "admin"), files.Upload)
	fileGroup.Get("/search", middleware.Protect("user", "admin"), files.Search)

	log.Fatal(app.Listen(":8080"))
}
