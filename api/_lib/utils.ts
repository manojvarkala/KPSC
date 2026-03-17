
export function normalizeSubject(subject: string, topic: string = '', question: string = ''): string {
    const s = String(subject || '').toLowerCase().trim();
    const t = String(topic || '').toLowerCase().trim();
    const q = String(question || '').toLowerCase().trim();
    const context = `${s} ${t} ${q}`;

    // 1. Core Subject Mapping
    if (context.includes('renaissance') || context.includes('നവോത്ഥാനം')) return "Kerala History / Renaissance";
    if (context.includes('kerala history') || context.includes('കേരള ചരിത്രം')) return "Kerala History";
    if (context.includes('kerala geo') || context.includes('കേരള ഭൂമിശാസ്ത്രം') || context.includes('river') || context.includes('district')) {
        if (context.includes('kerala')) return "Kerala Geography";
    }
    if (context.includes('kerala gk') || context.includes('കേരള സംബന്ധിയായ') || context.includes('kerala specific')) return "Kerala Specific GK";
    
    if (context.includes('indian history') || context.includes('ഇന്ത്യൻ ചരിത്രം') || context.includes('freedom struggle')) return "Indian History";
    if (context.includes('indian geo') || context.includes('ഇന്ത്യൻ ഭൂമിശാസ്ത്രം') || context.includes('himalaya') || context.includes('ganga') || context.includes('world geography')) return "Indian Geography";
    if (context.includes('polity') || context.includes('const') || context.includes('ഭരണഘടന') || context.includes('article') || context.includes('panchayat') || context.includes('administration')) return "Indian Polity / Constitution";
    if (context.includes('economy') || context.includes('സാമ്പത്തിക') || context.includes('gdp') || context.includes('budget')) return "Indian Economy";
    
    if (context.includes('biology') || context.includes('ജീവശാസ്ത്രം') || context.includes('life science') || context.includes('cell') || context.includes('human body') || context.includes('anatomy') || context.includes('physiology') || context.includes('botany') || context.includes('zoology')) return "Biology / Life Science";
    if (context.includes('chemistry') || context.includes('രസതന്ത്രം') || context.includes('element') || context.includes('formula') || context.includes('organic') || context.includes('inorganic')) return "Chemistry";
    if (context.includes('physics') || context.includes('ഭൗതികശാസ്ത്രം') || context.includes('motion') || context.includes('energy') || context.includes('mechanics') || context.includes('electromagnetism')) return "Physics";
    if (context.includes('gen science') || context.includes('ശാസ്ത്രം') || context.includes('tech') || context.includes('space')) return "General Science / Science & Tech";
    
    if (context.includes('math') || context.includes('arithmetic') || context.includes('ഗണിതം') || context.includes('percentage') || context.includes('interest') || context.includes('algebra') || context.includes('calculus')) return "Quantitative Aptitude";
    if (context.includes('reasoning') || context.includes('logic') || context.includes('mental') || context.includes('coding-decoding')) return "Reasoning / Mental Ability";
    
    if (context.includes('english') || context.includes('ഇംഗ്ലീഷ്')) return "English";
    if (context.includes('malayalam') || context.includes('മലയാളം')) return "Malayalam";
    if (context.includes('computer') || context.includes('it') || context.includes('cyber') || context.includes('ഇൻഫർമേഷൻ')) return "Computer Science / IT / Cyber Laws";
    if (context.includes('current affairs') || context.includes('നടപ്പ് കാര്യങ്ങൾ')) return "Current Affairs";
    if (context.includes('arts') || context.includes('culture') || context.includes('sports') || context.includes('കായികം')) return "Arts, Culture & Sports";
    if (context.includes('environment') || context.includes('പരിസ്ഥിതി')) return "Environment";
    
    return subject || "General Knowledge";
}
