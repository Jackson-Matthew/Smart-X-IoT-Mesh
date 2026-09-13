using Smart_X.Api.Models;

namespace Smart_X.Api.Services
{
    public class IssueService
    {
        private readonly List<ReportedIssue> _issues = [];

        public ReportedIssue AddIssue(
            ReportedIssue issue)
        {
            ArgumentNullException.ThrowIfNull(issue);

            _issues.Add(issue);

            return issue;
        }

        public List<ReportedIssue> GetAllIssues()
        {
            return _issues
                .OrderByDescending(issue => issue.ReportedAt)
                .ToList();
        }

        public List<ReportedIssue> GetIssuesForSensor(
            Guid sensorId)
        {
            return _issues
                .Where(issue => issue.SensorId == sensorId)
                .OrderByDescending(issue => issue.ReportedAt)
                .ToList();
        }

        public bool ResolveIssue(Guid issueId)
        {
            var issue = _issues.FirstOrDefault(
                existing => existing.Id == issueId);

            if (issue == null)
            {
                return false;
            }

            issue.Resolved = true;

            return true;
        }
    }
}