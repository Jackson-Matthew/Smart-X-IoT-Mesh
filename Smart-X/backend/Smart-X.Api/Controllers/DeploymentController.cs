using Microsoft.AspNetCore.Mvc;
using Smart_X.Api.Models;
using Smart_X.Api.Services;

namespace Smart_X.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DeploymentController : ControllerBase
    {
        private readonly DeploymentValidationService _validationService;

        public DeploymentController(
            DeploymentValidationService validationService)
        {
            _validationService = validationService;
        }

        // POST /api/Deployment/validate - send a nested JSON tree,
        // get back { valid: true/false } from the recursive validator.
        [HttpPost("validate")]
        public IActionResult ValidateDeployment(
            [FromBody] DeploymentNode node)
        {
            var isValid = _validationService.ValidateTree(node);

            return Ok(new
            {
                valid = isValid
            });
        }
    }
}