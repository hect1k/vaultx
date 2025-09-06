package middleware

import (
	"slices"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var JwtSecret = []byte("supersecretkey")

func Protect(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := c.Get("Authorization")
		if tokenStr == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Missing token"})
		}

		token, err := jwt.Parse(tokenStr[len("Bearer "):], func(token *jwt.Token) (interface{}, error) {
			return JwtSecret, nil
		})
		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid token"})
		}

		claims := token.Claims.(jwt.MapClaims)
		role := claims["role"].(string)

		// RBAC check simplified
		if slices.Contains(roles, role) {
			c.Locals("userID", claims["uid"])
			c.Locals("role", role)
			return c.Next()
		}

		return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
	}
}
