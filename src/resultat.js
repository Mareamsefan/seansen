export function lesAgentResultat(tekst) {
  const json = tekst?.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? tekst?.match(/\{[\s\S]*\}/)?.[0];
  if (!json) {
    return {
      type: 'person',
      summary: tekst?.trim().slice(0, 360) || 'Søket er ferdig. Se profilene for aktuelle treff.',
      teams: [],
      candidates: [...new Set((tekst?.match(/\bk\d{3}\b/gi) ?? []).map((id) => id.toLowerCase()))]
        .slice(0, 5)
        .map((id) => ({ id, score: null, reason: '' })),
      formatError: true,
    };
  }

  try {
    const data = JSON.parse(json);
    if (!data || !['team', 'person', 'follow_up'].includes(data.type)) throw new Error('Ugyldig resultat-type.');
    const lesScore = (score) => Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
    return {
      type: data.type,
      summary: typeof data.summary === 'string' ? data.summary.slice(0, 500) : '',
      followUp: typeof data.followUp === 'string' ? data.followUp.slice(0, 500) : '',
      teams: Array.isArray(data.teams) ? data.teams.slice(0, 3).map((team) => ({
        name: typeof team.name === 'string' ? team.name.slice(0, 100) : 'Teamforslag',
        score: lesScore(team.score),
        reason: typeof team.reason === 'string' ? team.reason.slice(0, 500) : '',
        members: Array.isArray(team.members) ? team.members.slice(0, 8)
          .filter((member) => typeof member?.id === 'string' && /^k\d{3}$/i.test(member.id))
          .map((member) => ({
            id: member.id.toLowerCase(),
            role: typeof member.role === 'string' ? member.role.slice(0, 100) : '',
            reason: typeof member.reason === 'string' ? member.reason.slice(0, 300) : '',
          })) : [],
      })) : [],
      candidates: Array.isArray(data.candidates) ? data.candidates.slice(0, 5)
        .filter((candidate) => typeof candidate?.id === 'string' && /^k\d{3}$/i.test(candidate.id))
        .map((candidate) => ({
          id: candidate.id.toLowerCase(),
          score: lesScore(candidate.score),
          reason: typeof candidate.reason === 'string' ? candidate.reason.slice(0, 500) : '',
        })) : [],
      formatError: false,
    };
  } catch (error) {
    return {
      type: 'person',
      summary: 'Kunne ikke tolke rangeringen. Prøv søket igjen.',
      teams: [],
      candidates: [],
      formatError: true,
    };
  }
}
