const fs = require('fs');

// googleFitService
const fitFile = 'src/utils/googleFitService.js';
let fitContent = fs.readFileSync(fitFile, 'utf8');
const getWeeklyAverageCalories = `
export const getWeeklyAverageCalories = async () => {
  const end = new Date().setHours(23, 59, 59, 999);
  const start = end - 7 * 86400000;
  const data = await fetchFit('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', 'POST', {
    aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: end
  });
  const buckets = data.bucket || [];
  let total = 0;
  let days = 0;
  for (const b of buckets) {
    const val = b.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal;
    if (val) {
      total += val;
      days++;
    }
  }
  return days > 0 ? Math.round(total / days) : null;
};
`;
if (!fitContent.includes('getWeeklyAverageCalories')) {
  fitContent += '\n' + getWeeklyAverageCalories;
  fs.writeFileSync(fitFile, fitContent);
}

// MyPlan
const myPlanFile = 'src/components/Dashboard/MyPlan.jsx';
let myPlanContent = fs.readFileSync(myPlanFile, 'utf8');
if (!myPlanContent.includes('import * as googleFit')) {
  myPlanContent = myPlanContent.replace(
    `import { getGenerativeModel } from 'firebase/ai';`,
    `import { getGenerativeModel } from 'firebase/ai';\nimport * as googleFit from '../../utils/googleFitService';`
  );
}
if (!myPlanContent.includes('const [sleepData')) {
  myPlanContent = myPlanContent.replace(
    `const [isGenerating, setIsGenerating] = useState(false);`,
    `const [isGenerating, setIsGenerating] = useState(false);\n  const [sleepData, setSleepData] = useState(null);\n  const [readinessColor, setReadinessColor] = useState('gray');\n  const [readinessLabel, setReadinessLabel] = useState('Checking Readiness...');`
  );
}
if (!myPlanContent.includes('googleFit.getSleep()')) {
  myPlanContent = myPlanContent.replace(
    `useEffect(() => { setLocalPlan(aiPlan); }, [aiPlan]);`,
    `useEffect(() => { setLocalPlan(aiPlan); }, [aiPlan]);\n\n  useEffect(() => {\n    const fetchSleep = async () => {\n      if (googleFit.getToken()) {\n        try {\n          const hrs = await googleFit.getSleep();\n          if (hrs) {\n            setSleepData(hrs);\n            const numHrs = parseFloat(hrs);\n            if (numHrs >= 7) {\n              setReadinessColor('var(--accent-green)');\n              setReadinessLabel('Optimal Readiness');\n            } else if (numHrs >= 5.5) {\n              setReadinessColor('var(--accent-orange)');\n              setReadinessLabel('Moderate Readiness');\n            } else {\n              setReadinessColor('#ff6b6b');\n              setReadinessLabel('Low Readiness — Consider Active Recovery');\n            }\n          }\n        } catch (e) { console.warn('Sleep fetch error:', e); }\n      }\n    };\n    fetchSleep();\n  }, []);`
  );
}
if (!myPlanContent.includes('Daily Readiness Badge')) {
    myPlanContent = myPlanContent.replace(
      `{/* Week Selector */}`,
      `{/* Daily Readiness Badge */}\n      {sleepData !== null && (\n        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.05)', border: \`1px solid \${readinessColor}\` }}>\n          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: readinessColor, boxShadow: \`0 0 8px \${readinessColor}\` }} />\n          <div>\n            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: readinessColor }}>{readinessLabel}</div>\n            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{sleepData} hrs sleep last night</div>\n          </div>\n        </div>\n      )}\n\n      {/* Week Selector */}`
    );
}
myPlanContent = myPlanContent.replace(
  `catch (e) { displayError('Could not share plan.'); }`,
  `catch { displayError('Could not share plan.'); }`
);
fs.writeFileSync(myPlanFile, myPlanContent);

// ProfilePage
const profileFile = 'src/components/Dashboard/ProfilePage.jsx';
let profileContent = fs.readFileSync(profileFile, 'utf8');
if (!profileContent.includes('import * as googleFit')) {
  profileContent = profileContent.replace(
    `import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';`,
    `import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';\nimport * as googleFit from '../../utils/googleFitService';\nimport { useState, useEffect } from 'react';`
  );
}
if (!profileContent.includes('const [dynamicTDEE')) {
  profileContent = profileContent.replace(
    `const handleSignOut = () => signOut(auth);`,
    `const handleSignOut = () => signOut(auth);\n  const [dynamicTDEE, setDynamicTDEE] = useState(null);\n  useEffect(() => {\n    const fetchTDEE = async () => {\n      if (googleFit.getToken()) {\n        try {\n          const tdee = await googleFit.getWeeklyAverageCalories();\n          if (tdee) setDynamicTDEE(tdee);\n        } catch (e) { console.warn('TDEE fetch error:', e); }\n      }\n    };\n    fetchTDEE();\n  }, []);`
  );
}
if (profileContent.includes('Array.from({length: 12}')) {
  profileContent = profileContent.replace(
    `weight: formData.goal === 'fatloss' ? parseInt(formData.weight) - (i * 0.5) : parseInt(formData.weight) + (i * 0.3)`,
    `weight: formData.goal === 'fatloss' ? parseInt(formData.weight) - (i * (dynamicTDEE ? (dynamicTDEE - 500) / 7700 * 7 : 0.5)) : parseInt(formData.weight) + (i * (dynamicTDEE ? (dynamicTDEE + 500) / 7700 * 7 : 0.3))`
  );
}
if (!profileContent.includes('TDEE:')) {
  profileContent = profileContent.replace(
    `</div>\n          </div>\n\n          {/* Visual Progress Chart */}`,
    `  <div className="profile-stat"><span className="label">TDEE</span><span className="value">{dynamicTDEE ? \`\${dynamicTDEE} kcal (Dynamic)\` : '—'}</span></div>\n            </div>\n          </div>\n\n          {/* Visual Progress Chart */}`
  );
}
fs.writeFileSync(profileFile, profileContent);

// CalorieTrackerPage
const calFile = 'src/components/Dashboard/CalorieTrackerPage.jsx';
let calContent = fs.readFileSync(calFile, 'utf8');
if (!calContent.includes('import * as googleFit')) {
  calContent = calContent.replace(
    `import { getGenerativeModel } from 'firebase/ai';`,
    `import { getGenerativeModel } from 'firebase/ai';\nimport * as googleFit from '../../utils/googleFitService';`
  );
}
if (!calContent.includes('const [dynamicTarget, setDynamicTarget]')) {
  calContent = calContent.replace(
    `const targetCals = isFatLoss ? weight * 22 : weight * 30;`,
    `const [dynamicTarget, setDynamicTarget] = useState(null);\n\n  const targetCals = isFatLoss ? weight * 22 : weight * 30;\n  const finalTargetCals = dynamicTarget || targetCals;`
  );

  calContent = calContent.replace(
    `const targetCarbs = Math.round((targetCals * 0.4) / 4);`,
    `const targetCarbs = Math.round((finalTargetCals * 0.4) / 4);`
  );
  calContent = calContent.replace(
    `const targetFat = Math.round((targetCals * 0.25) / 9);`,
    `const targetFat = Math.round((finalTargetCals * 0.25) / 9);`
  );
  calContent = calContent.replace(
    `<MacroRing label="Calories" current={totalCals} target={targetCals} color="var(--accent-orange)" unit="kcal" />`,
    `<MacroRing label="Calories" current={totalCals} target={finalTargetCals} color="var(--accent-orange)" unit="kcal" />`
  );
}
if (!calContent.includes('fetchTDEE')) {
  calContent = calContent.replace(
    `useEffect(() => {\n    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });\n  }, [messages]);`,
    `useEffect(() => {\n    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });\n  }, [messages]);\n\n  useEffect(() => {\n    const fetchTDEE = async () => {\n      if (googleFit.getToken()) {\n        try {\n          const tdee = await googleFit.getWeeklyAverageCalories();\n          if (tdee) setDynamicTarget(isFatLoss ? tdee - 500 : tdee + 500);\n        } catch (e) { console.warn('TDEE fetch error:', e); }\n      }\n    };\n    fetchTDEE();\n  }, [isFatLoss]);`
  );
}
fs.writeFileSync(calFile, calContent);

// Tests
const test1 = 'src/__tests__/MyPlanPerformance.test.jsx';
let t1 = fs.readFileSync(test1, 'utf8');
t1 = t1.replace(`'day1_0': true,`, `'w1_day1_0': true,`)
  .replace(`'day1_1': true,`, `'w1_day1_1': true,`)
  .replace(`'day1_2': true,`, `'w1_day1_2': true,`)
  .replace(`'day1_3': true,`, `'w1_day1_3': true,`)
  .replace(`'day1_4': true,`, `'w1_day1_4': true,`);
fs.writeFileSync(test1, t1);

const test2 = 'src/__tests__/ProfilePage.test.jsx';
let t2 = fs.readFileSync(test2, 'utf8');
t2 = t2.replace(`expect(emDashes.length).toBe(6);`, `expect(emDashes.length).toBe(7);`);
fs.writeFileSync(test2, t2);

const test3 = 'src/components/Dashboard/__tests__/ProfilePage.test.jsx';
let t3 = fs.readFileSync(test3, 'utf8');
t3 = t3.replace(`expect(dashes.length).toBe(6); // age, weight, height, goal, gym, location`, `expect(dashes.length).toBe(7); // age, weight, height, goal, gym, location, tdee`);
fs.writeFileSync(test3, t3);
