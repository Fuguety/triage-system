export function getPriorityMeta(priority)
{
  const priorityMap =
  {
    RESUSCITATION:
    {
      colorClass: "priority-immediate",
      hex: "#D32F2F",
      icon: "\u{1F534}",
      label: "Immediate",
      level: "Level 1"
    },
    EMERGENT:
    {
      colorClass: "priority-very-urgent",
      hex: "#F57C00",
      icon: "\u{1F7E0}",
      label: "Very Urgent",
      level: "Level 2"
    },
    URGENT:
    {
      colorClass: "priority-urgent",
      hex: "#FBC02D",
      icon: "\u{1F7E1}",
      label: "Urgent",
      level: "Level 3"
    },
    LESS_URGENT:
    {
      colorClass: "priority-standard",
      hex: "#388E3C",
      icon: "\u{1F7E2}",
      label: "Standard",
      level: "Level 4"
    },
    NON_URGENT:
    {
      colorClass: "priority-non-urgent",
      hex: "#1976D2",
      icon: "\u{1F535}",
      label: "Non-Urgent",
      level: "Level 5"
    }
  }

  return priorityMap[priority] || priorityMap.NON_URGENT
}
