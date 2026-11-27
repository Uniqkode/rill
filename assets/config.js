window.BRAND = {
  "slug": "rill",
  "name": "Rill",
  "sector": "Agriculture",
  "category": "AI IRRIGATION FORECASTS",
  "title": "Know where water\nis needed next.",
  "description": "For commercial farms and irrigation cooperatives. Rill combines soil readings, weather forecasts and crop stage to estimate the next watering need for each zone.",
  "promise": "AI forecasts crop water demand and gives irrigation teams a daily zone plan.",
  "audience": "For commercial farms and irrigation cooperatives",
  "accent": "#17604a",
  "ink": "#142f26",
  "paper": "#f1f5ed",
  "dark": "#133b2f",
  "layout": "water",
  "headingFont": "Inter",
  "bodyFont": "Inter",
  "motif": "Rill channels and measured water rings",
  "logoIdea": "An R made from two flowing channels; the counter is a water drop.",
  "image": "irrigation",
  "imageAlt": "Planted rows across a commercial agricultural field",
  "imageLabel": "MAKE EVERY CYCLE COUNT",
  "imageNote": "A measured approach to the next watering window.",
  "object": "Zone",
  "objects": "Zones",
  "placeLabel": "Farm / zone",
  "unit": "m³",
  "totalLabel": "Planned water volume",
  "workspace": "Riverbend Irrigation",
  "workspaceRole": "Water operations",
  "mainAction": "Add irrigation zone",
  "recordAction": "Mark watered",
  "finalStatus": "Watered",
  "queueTitle": "Today’s irrigation decisions",
  "queueDescription": "Compare the water forecast with the soil reading and the pump limit before approving a cycle.",
  "primaryMetric": "1,240",
  "primaryMetricLabel": "m³ in the sample water plan",
  "metricLabel": "Completed cycles",
  "chartTitle": "Sample review batches prepared this week",
  "chartUnit": "batches",
  "chart": [
    18,
    24,
    16,
    28,
    31,
    22,
    19
  ],
  "chartLabels": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun"
  ],
  "example": {
    "before": "A prepared farm scenario allocates 1,500 m³ using a fixed weekly schedule.",
    "after": "A reviewed zone plan allocates 1,240 m³ using the entered assumptions and operating limits.",
    "result": "260 m³",
    "label": "difference in the illustrative plan, not measured savings"
  },
  "flow": [
    "Read the conditions",
    "Forecast demand",
    "Check the limits",
    "Approve the cycle"
  ],
  "features": [
    [
      "01",
      "Read the conditions",
      "Bring together recent soil readings, crop stage and the next weather period."
    ],
    [
      "02",
      "Forecast demand",
      "Estimate the next day’s water requirement for each zone."
    ],
    [
      "03",
      "Check the limits",
      "Show the effect of a daily water or pump-capacity limit."
    ],
    [
      "04",
      "Approve the cycle",
      "The irrigation manager chooses the plan and records the outcome."
    ]
  ],
  "price": 499,
  "priceUnit": "farm",
  "included": "10,000 zone forecasts / month · 5 operators",
  "overage": "$0.025 per additional zone forecast",
  "noteLabel": "Watering note",
  "newName": "e.g. Zone 09 · Tomato",
  "newPlace": "e.g. Jos · North pivot",
  "article": "Turn a water forecast into a plan the farm can use",
  "article2": "Check the sensor before changing the irrigation cycle",
  "records": [
    [
      "RI-301",
      "Zone 01 · Tomato",
      "Jos · North pivot",
      180,
      92,
      "Needs review",
      "E. Danjuma",
      "Moisture 21%. Verify the reading before the next cycle."
    ],
    [
      "RI-302",
      "Zone 02 · Pepper",
      "Jos · East drip",
      145,
      78,
      "Needs review",
      "L. Obi",
      "Clogged emitter reported. Inspect before watering."
    ],
    [
      "RI-303",
      "Zone 03 · Onion",
      "Kano · Block A",
      160,
      62,
      "Scheduled",
      "E. Danjuma",
      "Evening cycle planned; check wind conditions first."
    ],
    [
      "RI-304",
      "Zone 04 · Cabbage",
      "Jos · South drip",
      130,
      29,
      "Watered",
      "L. Obi",
      "Cycle completed at the planned sample volume."
    ],
    [
      "RI-305",
      "Zone 05 · Rice",
      "Kebbi · Block C",
      210,
      86,
      "Needs review",
      "U. Sani",
      "Bund overflow noted. Check allocation and drainage."
    ],
    [
      "RI-306",
      "Zone 06 · Maize",
      "Kaduna · West pivot",
      165,
      35,
      "Watered",
      "U. Sani",
      "Flow meter checked and cycle recorded."
    ],
    [
      "RI-307",
      "Zone 07 · Soybean",
      "Niger · Block B",
      140,
      54,
      "Scheduled",
      "L. Obi",
      "Wait for the next soil observation before starting."
    ],
    [
      "RI-308",
      "Zone 08 · Greens",
      "Jos · Nursery",
      110,
      26,
      "Watered",
      "E. Danjuma",
      "Morning cycle complete. Review the next reading tomorrow."
    ]
  ],
  "ai": {
    "buyer": "Commercial farms & irrigation cooperatives",
    "input": "Soil readings, weather and crop stage",
    "output": "A water-demand forecast for each irrigation zone",
    "cadence": "Four forecast updates per day",
    "action": "Approve the watering plan",
    "headline": "The forecast becomes\nthe next watering plan.",
    "why": "Water demand changes with the weather and crop stage. Each new forecast requires the model to reassess every active zone and compare the recommendation with available pump capacity.",
    "scope": "A farm operator checks sensor quality and local conditions before any watering decision. This MVP does not control pumps.",
    "stages": [
      [
        "Read the conditions",
        "Bring together recent soil readings, crop stage and the next weather period."
      ],
      [
        "Forecast demand",
        "Estimate the next day’s water requirement for each zone."
      ],
      [
        "Check the limits",
        "Show the effect of a daily water or pump-capacity limit."
      ],
      [
        "Approve the cycle",
        "The irrigation manager chooses the plan and records the outcome."
      ]
    ],
    "workload": {
      "organizations": 80,
      "units": 60,
      "cycles": 120,
      "items": 1,
      "unit": "zone forecasts",
      "unitsLabel": "zones per farm",
      "cyclesLabel": "updates per zone / month",
      "itemsLabel": "forecast per update",
      "reportUnit": "zone plans",
      "reason": "Four daily updates across 60 zones create 7,200 forecasts per farm each month. The work repeats because weather and field conditions change."
    },
    "outputTitle": "North pivot · Next 24 hours",
    "outputTag": "Water forecast",
    "timeLabel": "Planning window · 14–15 November",
    "sources": [
      {
        "id": "S1",
        "name": "zone-01-observations.csv",
        "kind": "Soil observations",
        "excerpt": "Zone 01, tomato, flowering stage. Latest soil moisture: 21%. Previous reading: 23%. Observation note: confirm the sensor before changing the watering cycle."
      },
      {
        "id": "S2",
        "name": "zone-01-weather-plan.txt",
        "kind": "Weather & capacity scenario",
        "excerpt": "Prepared scenario: dry weather over the next planning window. Available allocation for Zone 01: 180 m³. Pump capacity must be shared with seven other zones."
      }
    ],
    "findings": [
      {
        "title": "Review Zone 01 before the evening cycle",
        "level": "Review",
        "source": "S1",
        "quote": "Latest soil moisture: 21%. Previous reading: 23%.",
        "action": "Confirm the sensor reading and inspect the crop before approving extra water."
      },
      {
        "title": "Keep the plan inside the pump budget",
        "level": "Review",
        "source": "S2",
        "quote": "Available allocation for Zone 01: 180 m³.",
        "action": "Review the zone order and avoid overlapping pump demand."
      }
    ],
    "summary": "A zone plan brings the demand estimate and the operating limit into the same decision. The farm manager approves the cycle.",
    "alternate": {
      "name": "Nursery · Completed cycle",
      "source": {
        "id": "S3",
        "name": "nursery-cycle.txt",
        "kind": "Completed cycle",
        "excerpt": "The nursery received its planned 110 m³ cycle. The operator confirmed the flow meter. The next decision is scheduled after a fresh soil reading."
      },
      "finding": {
        "title": "Wait for the next observation",
        "level": "Routine",
        "source": "S3",
        "quote": "The next decision is scheduled after a fresh soil reading.",
        "action": "Keep the completed cycle in the history and review the next reading before watering again."
      }
    },
    "example": {
      "before": "A prepared farm scenario allocates 1,500 m³ using a fixed weekly schedule.",
      "after": "A reviewed zone plan allocates 1,240 m³ using the entered assumptions and operating limits.",
      "result": "260 m³",
      "label": "difference in the illustrative plan, not measured savings"
    },
    "article": "Turn a water forecast into a plan the farm can use",
    "article2": "Check the sensor before changing the irrigation cycle",
    "articlePoints": [
      "Use the crop stage and recent soil trend, not one isolated reading.",
      "Recalculate when the weather forecast materially changes.",
      "Show the pump limit beside the water recommendation.",
      "Record what the operator actually applied and compare it with the plan."
    ],
    "volume": 576000,
    "reports": 576000,
    "tokensPerPage": null
  },
  "company": {
    "brand": "Rill",
    "legalName": null,
    "rcNumber": null,
    "contactEmail": null,
    "phone": null,
    "officeAddress": null,
    "bookingUrl": null,
    "domain": null,
    "usage": null,
    "team": [
      {
        "name": "Precious Arinze",
        "handle": "Uniqkode",
        "role": "CEO",
        "profile": "https://github.com/Uniqkode",
        "portrait": "maintainer-avatar.jpg",
        "verificationSource": "https://api.github.com/users/Uniqkode",
        "bio": "Maintains the published product source, working review interfaces and implementation documentation for Uniqkode.",
        "linkedin": null
      },
      {
        "name": "Amaka Eneh",
        "role": "Co-founder and CTO",
        "verified": true
      }
    ],
    "registrationVerified": false,
    "registrationEvidence": null,
    "headquarters": null,
    "bookingVerified": false,
    "contactVerified": false
  },
  "plan": {
    "composition": "Field inputs, zone planning, operator review, and forecast infrastructure",
    "design": "Irrigation planning workspace",
    "nav": "water",
    "gallery": [
      "rill-field",
      "rill-detail"
    ],
    "galleryAlt": [
      "Drip irrigation equipment in a cultivated field",
      "An irrigation channel beside cultivated fields"
    ],
    "chapters": [
      [
        "Read the ground",
        "A recent soil trend gives the watering decision context."
      ],
      [
        "Recalculate when conditions change",
        "Crop stage, forecast weather and pump capacity belong in the next daily plan."
      ],
      [
        "Confirm the actual cycle",
        "Compare the approved allocation with what the operator records at the flow meter."
      ]
    ],
    "next": "Connect sensor readings and weather data; train and evaluate a field-specific demand model.",
    "pilot": "Compare recommended allocations with soil trends and operator-recorded water applications across a growing period.",
    "reviewRoles": [
      "Irrigation operations",
      "Agronomy review",
      "Forecast evaluation"
    ]
  },
  "roadmap": [
    {
      "stage": "01",
      "title": "Forecast zone water demand",
      "status": "Available to try",
      "detail": "Adjust sample readings to see predicted demand, suggested volumes and pump time by zone."
    },
    {
      "stage": "02",
      "title": "Connect field inputs",
      "status": "Next",
      "detail": "Bring soil probes, flow meters and weather feeds into daily planning."
    },
    {
      "stage": "03",
      "title": "Validate with farm teams",
      "status": "Planned",
      "detail": "Train on approved histories and compare forecasts with reviewed field water needs across later watering cycles."
    }
  ],
  "growth": {
    "problemTitle": "A fixed schedule misses changing conditions.",
    "problem": "The next watering decision depends on soil conditions, weather, crop stage and pump capacity. A calendar alone cannot explain which zone should receive attention first.",
    "friction": [
      "A recent forecast can change the next day’s demand.",
      "Several zones may compete for the same water or pump limit.",
      "The operator needs to compare the plan with actual application."
    ],
    "whyTitle": "Use each new reading in the next plan.",
    "whyNow": "Soil readings and weather forecasts become more valuable when they change a dated operating plan. The opportunity is to connect the forecast, the water limit and the operator’s recorded cycle.",
    "segments": [
      {
        "name": "Commercial farms",
        "need": "Plan daily allocations across active zones.",
        "workflow": "Combine soil and crop observations with the next weather period."
      },
      {
        "name": "Irrigation cooperatives",
        "need": "Share a limited supply transparently.",
        "workflow": "Compare zone demand with the agreed daily water budget."
      },
      {
        "name": "Irrigation service teams",
        "need": "Check the plan against what was applied.",
        "workflow": "Record flow-meter observations and investigate differences."
      }
    ],
    "distribution": "Begin with farm irrigation managers and irrigation-service partners. Establish a repeatable operator review before adding devices or growing areas.",
    "expansion": "Add climate zones and crops only when the forecast has been evaluated against their local conditions.",
    "metrics": [
      {
        "title": "A considered water allocation",
        "measure": "Applied volume versus approved plan",
        "method": "Compare operator records and flow-meter readings with the dated zone plan."
      },
      {
        "title": "A forecast worth using",
        "measure": "Zone demand forecast error",
        "method": "Use time-separated evaluation periods and record missing sensor or weather inputs."
      },
      {
        "title": "Less planning overhead",
        "measure": "Minutes to approve a daily plan",
        "method": "Include the manager’s review and any changes required by pump or water limits."
      }
    ],
    "methods": [
      {
        "name": "Zone demand forecasting",
        "job": "Estimate demand from recent soil readings, crop stage and the weather outlook.",
        "test": "Compare forecast error with the farm’s existing planning method across later watering cycles."
      },
      {
        "name": "Constraint-aware allocation",
        "job": "Compare estimated demand with the available daily water and pump limit.",
        "test": "Check whether the approved allocations fit the stated operating constraints."
      },
      {
        "name": "Forecast explanation",
        "job": "Prepare a readable explanation of a zone’s next proposed cycle.",
        "test": "Check that the explanation matches the actual forecast inputs and uncertainty."
      }
    ],
    "compute": "Measure forecast processing time, missing field inputs and the daily update volume during field pilots.",
    "tool": "water",
    "toolTitle": "Compare a daily water budget.",
    "toolIntro": "Change the available budget and reserve. This planning tool shows the resulting allocation; it is not a live irrigation command.",
    "value": {
      "unit": "daily zone plans",
      "volume": 150,
      "before": 20,
      "after": 9,
      "hourly": 6000
    },
    "role": "Irrigation operations",
    "output": "A reviewed daily zone plan",
    "market": {
      "initial": [
        "Nigeria"
      ],
      "next": [
        "Ghana",
        "Kenya"
      ],
      "status": "Market strategy"
    }
  },
  "photoId": "photo-1560493676-04071c5f467b",
  "photoSourceURL": "https://unsplash.com",
  "photoCredit": "Agricultural field photography",
  "photoLicense": "https://unsplash.com/license",
  "photoLicenseName": "Unsplash license",
  "preloadFont": "inter-variable.woff2",
  "photography": [
    {
      "name": "rill-field",
      "query": "drip irrigation field",
      "title": "Drip irrigation in Chinawal 1.jpg",
      "url": "https://upload.wikimedia.org/wikipedia/commons/d/da/Drip_irrigation_in_Chinawal_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
      "original": "https://upload.wikimedia.org/wikipedia/commons/d/da/Drip_irrigation_in_Chinawal_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      "source": "https://commons.wikimedia.org/wiki/File:Drip_irrigation_in_Chinawal_1.jpg",
      "license": "CC BY-SA 3.0",
      "license_url": "https://creativecommons.org/licenses/by-sa/3.0",
      "author": "abhiriksh",
      "description": "Drip irrigation equipment in a cultivated field",
      "file": "editorial-1.jpg",
      "width": 960,
      "height": 1280,
      "modifications": "Resized and recompressed for website display; CSS may crop the displayed image."
    },
    {
      "name": "rill-detail",
      "query": "agricultural sprinkler irrigation",
      "title": "NRBC distributary 10 sprinkler irrigation fields Raichur Karnataka India.jpg",
      "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/NRBC_distributary_10_sprinkler_irrigation_fields_Raichur_Karnataka_India.jpg/1920px-NRBC_distributary_10_sprinkler_irrigation_fields_Raichur_Karnataka_India.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
      "original": "https://upload.wikimedia.org/wikipedia/commons/c/cf/NRBC_distributary_10_sprinkler_irrigation_fields_Raichur_Karnataka_India.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      "source": "https://commons.wikimedia.org/wiki/File:NRBC_distributary_10_sprinkler_irrigation_fields_Raichur_Karnataka_India.jpg",
      "license": "CC BY-SA 4.0",
      "license_url": "https://creativecommons.org/licenses/by-sa/4.0",
      "author": "Vraj Acharya, WELL Labs",
      "description": "An irrigation channel beside cultivated fields",
      "file": "editorial-2.jpg",
      "width": 1500,
      "height": 1000,
      "modifications": "Resized and recompressed; CSS display cropping."
    }
  ],
  "priceCurrency": "USD"
};
