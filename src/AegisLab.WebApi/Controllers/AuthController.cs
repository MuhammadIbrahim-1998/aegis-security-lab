using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace AegisLab.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private static readonly Dictionary<string, (string Password, string Role)> Users = new()
    {
        ["alice"] = ("password123", "User"),
        ["admin"] = ("admin123", "Admin")
    };

    private const string FallbackKey = "AegisLab_SuperSecret_Dev_Key_2024";

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (!Users.TryGetValue(request.Username, out var user) || user.Password != request.Password)
            return Unauthorized(new { message = "Invalid credentials" });

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, request.Username),
            new(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(FallbackKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds);

        return Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
    }

    [Authorize]
    [HttpGet("admin-panel")]
    public IActionResult AdminPanel()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (role != "Admin")
            return Forbid();

        return Ok(new { message = "Welcome to the admin panel.", secret = "AEGIS_LAB_FLAG_001" });
    }

    [Authorize]
    [HttpGet("profile")]
    public IActionResult Profile()
    {
        return Ok(new
        {
            username = User.Identity?.Name,
            role = User.FindFirst(ClaimTypes.Role)?.Value
        });
    }
}

public record LoginRequest(string Username, string Password);