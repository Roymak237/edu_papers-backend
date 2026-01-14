const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  createQuiz,
  createQuizQuestion,
  getQuizById,
  getQuestionsByQuizId
} = require('../db/db');

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
};

// Quiz question templates for different subjects and difficulties
const quizTemplates = {
  biology: {
    easy: [
      {
        question: "What is the basic unit of life?",
        options: ["Cell", "Atom", "Molecule", "Tissue"],
        correctAnswer: 0,
        explanation: "The cell is the basic structural and functional unit of all living organisms."
      },
      {
        question: "Which organelle is responsible for photosynthesis in plant cells?",
        options: ["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"],
        correctAnswer: 1,
        explanation: "Chloroplasts contain chlorophyll and are the site of photosynthesis in plant cells."
      },
      {
        question: "What is DNA?",
        options: ["A type of protein", "A molecule that carries genetic information", "An energy molecule", "A type of lipid"],
        correctAnswer: 1,
        explanation: "DNA (Deoxyribonucleic Acid) is the molecule that carries genetic instructions for the development, functioning, growth, and reproduction of all known organisms."
      }
    ],
    medium: [
      {
        question: "What is the process by which plants make their own food using sunlight?",
        options: ["Respiration", "Photosynthesis", "Digestion", "Fermentation"],
        correctAnswer: 1,
        explanation: "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose."
      },
      {
        question: "Which of the following is NOT a type of cell division?",
        options: ["Mitosis", "Meiosis", "Binary Fission", "Osmosis"],
        correctAnswer: 3,
        explanation: "Osmosis is the movement of water across a semipermeable membrane, not a type of cell division."
      },
      {
        question: "What is the function of mitochondria in cells?",
        options: ["Protein synthesis", "Energy production", "DNA storage", "Cell division"],
        correctAnswer: 1,
        explanation: "Mitochondria are known as the powerhouse of the cell as they produce ATP through cellular respiration."
      }
    ],
    hard: [
      {
        question: "What is the difference between prokaryotic and eukaryotic cells?",
        options: ["Prokaryotic cells have a nucleus, eukaryotic cells do not", "Eukaryotic cells have a nucleus, prokaryotic cells do not", "Both have nuclei but different organelles", "There is no difference"],
        correctAnswer: 1,
        explanation: "The main difference is that eukaryotic cells have a membrane-bound nucleus, while prokaryotic cells do not."
      },
      {
        question: "What is the role of enzymes in biological reactions?",
        options: ["To provide energy", "To speed up reactions", "To slow down reactions", "To act as a reactant"],
        correctAnswer: 1,
        explanation: "Enzymes are biological catalysts that speed up chemical reactions without being consumed in the process."
      },
      {
        question: "What is the central dogma of molecular biology?",
        options: ["DNA → RNA → Protein", "Protein → RNA → DNA", "RNA → DNA → Protein", "DNA → Protein → RNA"],
        correctAnswer: 0,
        explanation: "The central dogma describes the flow of genetic information: DNA is transcribed to RNA, which is then translated into protein."
      }
    ],
    veryHard: [
      {
        question: "What is the mechanism of action of CRISPR-Cas9 in gene editing?",
        options: ["It cuts DNA at specific locations", "It adds new DNA sequences", "It removes entire chromosomes", "It modifies RNA only"],
        correctAnswer: 0,
        explanation: "CRISPR-Cas9 uses a guide RNA to direct the Cas9 enzyme to a specific DNA sequence, where it creates a double-strand break."
      },
      {
        question: "What is epigenetics?",
        options: ["The study of genes", "The study of heritable changes not involving changes in DNA sequence", "The study of protein structure", "The study of cell division"],
        correctAnswer: 1,
        explanation: "Epigenetics involves heritable changes in gene expression that do not involve changes to the underlying DNA sequence."
      },
      {
        question: "What is the role of telomeres in chromosomes?",
        options: ["They code for proteins", "They protect chromosome ends from deterioration", "They initiate DNA replication", "They control cell division"],
        correctAnswer: 1,
        explanation: "Telomeres are repetitive DNA sequences at chromosome ends that protect them from deterioration and prevent fusion with neighboring chromosomes."
      }
    ]
  },
  chemistry: {
    easy: [
      {
        question: "What is the chemical symbol for water?",
        options: ["H2O", "CO2", "NaCl", "O2"],
        correctAnswer: 0,
        explanation: "Water is represented by the chemical formula H2O, meaning two hydrogen atoms bonded to one oxygen atom."
      },
      {
        question: "What is the smallest particle of an element that retains its chemical properties?",
        options: ["Molecule", "Atom", "Compound", "Ion"],
        correctAnswer: 1,
        explanation: "An atom is the smallest unit of an element that maintains the chemical properties of that element."
      },
      {
        question: "What is the pH scale used to measure?",
        options: ["Temperature", "Acidity or basicity", "Density", "Pressure"],
        correctAnswer: 1,
        explanation: "The pH scale measures how acidic or basic a solution is, ranging from 0 (very acidic) to 14 (very basic)."
      }
    ],
    medium: [
      {
        question: "What type of bond involves the sharing of electrons between atoms?",
        options: ["Ionic bond", "Covalent bond", "Metallic bond", "Hydrogen bond"],
        correctAnswer: 1,
        explanation: "A covalent bond is formed when two atoms share one or more pairs of electrons."
      },
      {
        question: "What is Avogadro's number?",
        options: ["6.022 × 10^23", "3.14159", "9.81 m/s²", "1.602 × 10^-19"],
        correctAnswer: 0,
        explanation: "Avogadro's number (6.022 × 10^23) is the number of particles in one mole of a substance."
      },
      {
        question: "What is the difference between an element and a compound?",
        options: ["Elements are pure substances, compounds are combinations of elements", "Compounds are pure substances, elements are combinations", "There is no difference", "Elements are liquids, compounds are solids"],
        correctAnswer: 0,
        explanation: "An element is a pure substance consisting of only one type of atom, while a compound consists of two or more different elements chemically bonded together."
      }
    ],
    hard: [
      {
        question: "What is the difference between oxidation and reduction?",
        options: ["Oxidation gains electrons, reduction loses electrons", "Oxidation loses electrons, reduction gains electrons", "Both involve gaining electrons", "Both involve losing electrons"],
        correctAnswer: 1,
        explanation: "Oxidation is the loss of electrons, while reduction is the gain of electrons. This is often remembered by the acronym OIL RIG (Oxidation Is Loss, Reduction Is Gain)."
      },
      {
        question: "What is Le Chatelier's principle?",
        options: ["A principle about chemical bonding", "A principle about equilibrium shifts", "A principle about gas laws", "A principle about thermodynamics"],
        correctAnswer: 1,
        explanation: "Le Chatelier's principle states that if a system at equilibrium is disturbed, the system will shift to counteract the disturbance and establish a new equilibrium."
      },
      {
        question: "What is the difference between exothermic and endothermic reactions?",
        options: ["Exothermic absorbs heat, endothermic releases heat", "Endothermic absorbs heat, exothermic releases heat", "Both absorb heat", "Both release heat"],
        correctAnswer: 1,
        explanation: "Exothermic reactions release heat to the surroundings, while endothermic reactions absorb heat from the surroundings."
      }
    ],
    veryHard: [
      {
        question: "What is the difference between thermodynamic and kinetic control in chemical reactions?",
        options: ["Thermodynamic control depends on activation energy", "Kinetic control depends on product stability", "Thermodynamic control favors the most stable product, kinetic control favors the fastest forming product", "There is no difference"],
        correctAnswer: 2,
        explanation: "Thermodynamic control leads to the most stable product (lowest Gibbs free energy), while kinetic control leads to the product formed fastest (lowest activation energy)."
      },
      {
        question: "What is the role of a catalyst in a chemical reaction?",
        options: ["It increases the energy of reactants", "It decreases the activation energy", "It becomes part of the products", "It slows down the reaction"],
        correctAnswer: 1,
        explanation: "A catalyst provides an alternative reaction pathway with lower activation energy, increasing the reaction rate without being consumed."
      },
      {
        question: "What is the difference between a homogeneous and heterogeneous catalyst?",
        options: ["Homogeneous is in a different phase than reactants", "Heterogeneous is in the same phase as reactants", "Homogeneous is in the same phase as reactants, heterogeneous is in a different phase", "There is no difference"],
        correctAnswer: 2,
        explanation: "A homogeneous catalyst is in the same phase as the reactants, while a heterogeneous catalyst is in a different phase."
      }
    ]
  },
  geography: {
    easy: [
      {
        question: "What is the largest continent by area?",
        options: ["Africa", "Asia", "Europe", "North America"],
        correctAnswer: 1,
        explanation: "Asia is the largest continent by both area and population."
      },
      {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2,
        explanation: "Paris is the capital and largest city of France."
      },
      {
        question: "What is the longest river in the world?",
        options: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
        correctAnswer: 1,
        explanation: "The Nile River is generally considered the longest river in the world, stretching approximately 6,650 kilometers."
      }
    ],
    medium: [
      {
        question: "What is the Ring of Fire?",
        options: ["A volcanic region in the Pacific Ocean", "A desert in Africa", "A mountain range in Europe", "A river system in South America"],
        correctAnswer: 0,
        explanation: "The Ring of Fire is a major area in the Pacific Ocean where a large number of earthquakes and volcanic eruptions occur."
      },
      {
        question: "What type of climate is characterized by hot, dry summers and mild, wet winters?",
        options: ["Tropical", "Mediterranean", "Continental", "Polar"],
        correctAnswer: 1,
        explanation: "The Mediterranean climate is characterized by hot, dry summers and mild, wet winters, found in regions around the Mediterranean Sea."
      },
      {
        question: "What is the difference between weather and climate?",
        options: ["Weather is long-term, climate is short-term", "Climate is long-term, weather is short-term", "They are the same thing", "Weather only refers to temperature"],
        correctAnswer: 1,
        explanation: "Weather refers to short-term atmospheric conditions, while climate refers to long-term patterns of weather in a specific area."
      }
    ],
    hard: [
      {
        question: "What is the difference between renewable and non-renewable resources?",
        options: ["Renewable resources are unlimited, non-renewable are limited", "Non-renewable resources are unlimited, renewable are limited", "Both are unlimited", "Both are limited"],
        correctAnswer: 0,
        explanation: "Renewable resources can be replenished naturally over time (like solar, wind), while non-renewable resources exist in finite amounts (like fossil fuels)."
      },
      {
        question: "What is urbanization?",
        options: ["The movement of people from rural to urban areas", "The movement of people from urban to rural areas", "The decline of cities", "The growth of agriculture"],
        correctAnswer: 0,
        explanation: "Urbanization is the process by which large numbers of people become permanently concentrated in relatively small areas, forming cities."
      },
      {
        question: "What is the greenhouse effect?",
        options: ["A cooling effect on Earth's climate", "The trapping of heat in Earth's atmosphere by greenhouse gases", "The reflection of sunlight by clouds", "The absorption of heat by oceans"],
        correctAnswer: 1,
        explanation: "The greenhouse effect is the process by which greenhouse gases in Earth's atmosphere trap heat, warming the planet."
      }
    ],
    veryHard: [
      {
        question: "What is the difference between absolute and relative location?",
        options: ["Absolute location uses coordinates, relative location uses landmarks", "Relative location uses coordinates, absolute location uses landmarks", "They are the same thing", "Absolute location changes over time"],
        correctAnswer: 0,
        explanation: "Absolute location refers to a specific point on Earth's surface using coordinates (latitude and longitude), while relative location describes a place in relation to other places."
      },
      {
        question: "What is the demographic transition model?",
        options: ["A model of population growth", "A model of economic development", "A model of urbanization", "A model of climate change"],
        correctAnswer: 0,
        explanation: "The demographic transition model describes the transition from high birth and death rates to low birth and death rates as a country develops."
      },
      {
        question: "What is the difference between core and periphery in world systems theory?",
        options: ["Core countries are wealthy, periphery countries are poor", "Periphery countries are wealthy, core countries are poor", "Both are wealthy", "Both are poor"],
        correctAnswer: 0,
        explanation: "Core countries are wealthy, industrialized nations with dominant economies, while periphery countries are poorer, less developed nations that provide raw materials to core countries."
      }
    ]
  },
  "system design and modelling": {
    easy: [
      {
        question: "What is a system?",
        options: ["A single component", "A set of interacting components", "A type of software", "A programming language"],
        correctAnswer: 1,
        explanation: "A system is a set of interacting or interdependent component parts forming a complex/intricate whole."
      },
      {
        question: "What is UML?",
        options: ["A programming language", "A modeling language for software design", "A database system", "A type of network"],
        correctAnswer: 1,
        explanation: "UML (Unified Modeling Language) is a standardized modeling language for specifying, visualizing, constructing, and documenting software systems."
      },
      {
        question: "What is a use case diagram?",
        options: ["A diagram showing code structure", "A diagram showing system interactions with users", "A diagram showing database tables", "A diagram showing network connections"],
        correctAnswer: 1,
        explanation: "A use case diagram shows the interactions between users (actors) and the system to achieve specific goals."
      }
    ],
    medium: [
      {
        question: "What is the difference between a class diagram and an object diagram?",
        options: ["Class diagrams show instances, object diagrams show classes", "Object diagrams show instances, class diagrams show classes", "They are the same", "Class diagrams are for databases, object diagrams are for code"],
        correctAnswer: 1,
        explanation: "Class diagrams show the static structure of classes in a system, while object diagrams show specific instances of those classes at a particular point in time."
      },
      {
        question: "What is a sequence diagram?",
        options: ["A diagram showing system architecture", "A diagram showing the order of interactions between objects", "A diagram showing data flow", "A diagram showing database relationships"],
        correctAnswer: 1,
        explanation: "A sequence diagram shows how objects interact with each other in a particular scenario of a use case, displaying the sequence of messages exchanged."
      },
      {
        question: "What is the difference between aggregation and composition in UML?",
        options: ["Aggregation is a strong relationship, composition is weak", "Composition is a strong relationship, aggregation is weak", "They are the same", "Aggregation is for classes, composition is for objects"],
        correctAnswer: 1,
        explanation: "Composition is a strong relationship where the part cannot exist without the whole, while aggregation is a weaker relationship where the part can exist independently."
      }
    ],
    hard: [
      {
        question: "What is the purpose of a state diagram?",
        options: ["To show system architecture", "To show the states an object can be in and transitions between them", "To show data flow", "To show class relationships"],
        correctAnswer: 1,
        explanation: "A state diagram shows the various states an object can be in during its lifetime and how it transitions between these states in response to events."
      },
      {
        question: "What is the difference between logical and physical data models?",
        options: ["Logical models show implementation details, physical models show concepts", "Physical models show implementation details, logical models show concepts", "They are the same", "Logical models are for databases, physical models are for code"],
        correctAnswer: 1,
        explanation: "Logical data models represent the business requirements and concepts, while physical data models show how these will be implemented in a specific database system."
      },
      {
        question: "What is the purpose of a component diagram?",
        options: ["To show object states", "To show how components are wired together to form larger components or systems", "To show class relationships", "To show use cases"],
        correctAnswer: 1,
        explanation: "A component diagram shows how components are wired together to form larger components or software systems, illustrating the structure of the system at a high level."
      }
    ],
    veryHard: [
      {
        question: "What is the difference between a deployment diagram and a component diagram?",
        options: ["Deployment shows components, component shows hardware", "Deployment shows hardware and software nodes, component shows software components", "They are the same", "Deployment is for networks, component is for databases"],
        correctAnswer: 1,
        explanation: "A deployment diagram shows the hardware and software elements of a system and how they are deployed, while a component diagram shows the software components and their relationships."
      },
      {
        question: "What is model-driven architecture (MDA)?",
        options: ["A programming language", "An approach to software design using models to generate code", "A type of database", "A network protocol"],
        correctAnswer: 1,
        explanation: "MDA is a software design approach that uses models to specify system functionality and automatically generates implementation code from these models."
      },
      {
        question: "What is the difference between functional and non-functional requirements in system design?",
        options: ["Functional requirements describe what the system should do, non-functional describe how it should perform", "Non-functional requirements describe what the system should do, functional describe how it should perform", "They are the same", "Functional requirements are optional, non-functional are mandatory"],
        correctAnswer: 0,
        explanation: "Functional requirements specify what the system should do (its features), while non-functional requirements specify how the system should be (performance, security, reliability, etc.)."
      }
    ]
  },
  "software engineering": {
    easy: [
      {
        question: "What is software engineering?",
        options: ["The study of hardware", "The systematic application of engineering approaches to software development", "A type of programming language", "A database management system"],
        correctAnswer: 1,
        explanation: "Software engineering is the systematic application of engineering approaches to the development of software."
      },
      {
        question: "What is the software development life cycle (SDLC)?",
        options: ["A programming language", "The process used by the software industry to design, develop, and test high-quality software", "A type of database", "A network protocol"],
        correctAnswer: 1,
        explanation: "SDLC is a process used by the software industry to design, develop, and test high-quality software, typically including phases like planning, analysis, design, implementation, testing, and maintenance."
      },
      {
        question: "What is a requirement in software engineering?",
        options: ["A programming tool", "A documented need or expectation for a software product", "A type of bug", "A testing technique"],
        correctAnswer: 1,
        explanation: "A requirement is a documented need or expectation that a software product must meet to be considered successful."
      }
    ],
    medium: [
      {
        question: "What is the difference between unit testing and integration testing?",
        options: ["Unit testing tests individual components, integration testing tests how components work together", "Integration testing tests individual components, unit testing tests how components work together", "They are the same", "Unit testing is for databases, integration testing is for code"],
        correctAnswer: 0,
        explanation: "Unit testing focuses on testing individual components or functions in isolation, while integration testing verifies that different components work together correctly."
      },
      {
        question: "What is the difference between agile and waterfall methodologies?",
        options: ["Agile is sequential, waterfall is iterative", "Waterfall is sequential, agile is iterative and flexible", "They are the same", "Agile is for small projects, waterfall is for large projects"],
        correctAnswer: 1,
        explanation: "Waterfall follows a sequential, linear approach, while agile is iterative and flexible, allowing for changes and continuous feedback throughout development."
      },
      {
        question: "What is version control?",
        options: ["A type of testing", "A system that records changes to files over time", "A programming language", "A database system"],
        correctAnswer: 1,
        explanation: "Version control is a system that records changes to files over time, allowing you to recall specific versions later."
      }
    ],
    hard: [
      {
        question: "What is technical debt?",
        options: ["Money owed for software development", "The implied cost of additional rework caused by choosing an easy solution now instead of a better approach that would take longer", "A type of software bug", "A testing technique"],
        correctAnswer: 1,
        explanation: "Technical debt refers to the implied cost of additional rework caused by choosing an easy solution now instead of a better approach that would take longer."
      },
      {
        question: "What is the difference between refactoring and rewriting?",
        options: ["Refactoring changes the code structure without changing behavior, rewriting starts from scratch", "Rewriting changes structure without changing behavior, refactoring starts from scratch", "They are the same", "Refactoring is for bugs, rewriting is for features"],
        correctAnswer: 0,
        explanation: "Refactoring improves code structure without changing its external behavior, while rewriting involves creating new code from scratch."
      },
      {
        question: "What is continuous integration (CI)?",
        options: ["A type of testing", "The practice of merging all developers' working copies to a shared mainline several times a day", "A programming language", "A database system"],
        correctAnswer: 1,
        explanation: "Continuous integration is the practice of merging all developers' working copies to a shared mainline several times a day, with automated builds and tests."
      }
    ],
    veryHard: [
      {
        question: "What is the difference between monolithic and microservices architecture?",
        options: ["Monolithic has many services, microservices has one", "Microservices breaks applications into small, independent services, monolithic is a single unified codebase", "They are the same", "Monolithic is for web apps, microservices are for mobile apps"],
        correctAnswer: 1,
        explanation: "Monolithic architecture builds applications as a single unified unit, while microservices architecture breaks applications into small, independent services that communicate through APIs."
      },
      {
        question: "What is the CAP theorem in distributed systems?",
        options: ["A theorem about programming languages", "A theorem stating a distributed system can provide at most two of: consistency, availability, partition tolerance", "A theorem about databases", "A theorem about networks"],
        correctAnswer: 1,
        explanation: "The CAP theorem states that a distributed data store can provide at most two of three guarantees: Consistency, Availability, and Partition tolerance."
      },
      {
        question: "What is the difference between synchronous and asynchronous communication in distributed systems?",
        options: ["Synchronous waits for response, asynchronous doesn't", "Asynchronous waits for response, synchronous doesn't", "They are the same", "Synchronous is for databases, asynchronous is for code"],
        correctAnswer: 0,
        explanation: "Synchronous communication blocks until a response is received, while asynchronous communication doesn't block and the response is handled later through callbacks or events."
      }
    ]
  },
  "cyber security": {
    easy: [
      {
        question: "What is a firewall?",
        options: ["A type of virus", "A network security system that monitors and controls incoming and outgoing network traffic", "A programming language", "A type of hardware"],
        correctAnswer: 1,
        explanation: "A firewall is a network security system that monitors and controls incoming and outgoing network traffic based on predetermined security rules."
      },
      {
        question: "What is a password?",
        options: ["A type of virus", "A string of characters used to verify a user's identity", "A programming language", "A type of hardware"],
        correctAnswer: 1,
        explanation: "A password is a string of characters used to verify a user's identity and grant access to a system or resource."
      },
      {
        question: "What is phishing?",
        options: ["A type of fishing sport", "A fraudulent attempt to obtain sensitive information by disguising as a trustworthy entity", "A type of firewall", "A programming language"],
        correctAnswer: 1,
        explanation: "Phishing is a fraudulent attempt to obtain sensitive information such as usernames, passwords, and credit card details by disguising as a trustworthy entity."
      }
    ],
    medium: [
      {
        question: "What is encryption?",
        options: ["A type of virus", "The process of converting information into a code to prevent unauthorized access", "A type of firewall", "A programming language"],
        correctAnswer: 1,
        explanation: "Encryption is the process of converting information or data into a code to prevent unauthorized access, requiring a decryption key to read."
      },
      {
        question: "What is the difference between symmetric and asymmetric encryption?",
        options: ["Symmetric uses one key, asymmetric uses two keys", "Asymmetric uses one key, symmetric uses two keys", "They are the same", "Symmetric is for files, asymmetric is for networks"],
        correctAnswer: 0,
        explanation: "Symmetric encryption uses the same key for both encryption and decryption, while asymmetric encryption uses a public key for encryption and a private key for decryption."
      },
      {
        question: "What is a VPN?",
        options: ["A type of virus", "A Virtual Private Network that creates a secure connection over a public network", "A type of firewall", "A programming language"],
        correctAnswer: 1,
        explanation: "A VPN (Virtual Private Network) creates a secure, encrypted connection over a less secure network, such as the internet."
      }
    ],
    hard: [
      {
        question: "What is the difference between authentication and authorization?",
        options: ["Authentication verifies identity, authorization determines access rights", "Authorization verifies identity, authentication determines access rights", "They are the same", "Authentication is for networks, authorization is for databases"],
        correctAnswer: 0,
        explanation: "Authentication is the process of verifying who a user is, while authorization is the process of determining what permissions an authenticated user has."
      },
      {
        question: "What is a man-in-the-middle attack?",
        options: ["An attack where the attacker secretly intercepts and relays messages between two parties", "An attack that targets middle management", "A type of virus", "A type of firewall"],
        correctAnswer: 0,
        explanation: "A man-in-the-middle attack is where an attacker secretly intercepts and possibly alters communications between two parties who believe they are directly communicating with each other."
      },
      {
        question: "What is SQL injection?",
        options: ["A type of database", "A code injection technique that exploits vulnerabilities in an application's software", "A type of firewall", "A programming language"],
        correctAnswer: 1,
        explanation: "SQL injection is a code injection technique that exploits vulnerabilities in an application's software by inserting malicious SQL statements into an entry field."
      }
    ],
    veryHard: [
      {
        question: "What is zero-trust security?",
        options: ["A security model with no trust by default, requiring verification for everyone", "A security model with no security", "A type of virus", "A type of firewall"],
        correctAnswer: 0,
        explanation: "Zero-trust security is a model that assumes no user or device is trustworthy by default, requiring strict identity verification for every person and device trying to access resources."
      },
      {
        question: "What is the difference between a vulnerability, an exploit, and a threat?",
        options: ["Vulnerability is a weakness, exploit is code that takes advantage of it, threat is potential danger", "Exploit is a weakness, vulnerability is code that takes advantage of it, threat is potential danger", "They are the same", "Vulnerability is a virus, exploit is a firewall, threat is a network"],
        correctAnswer: 0,
        explanation: "A vulnerability is a weakness in a system, an exploit is code or technique that takes advantage of that weakness, and a threat is a potential danger that could exploit a vulnerability."
      },
      {
        question: "What is the principle of least privilege?",
        options: ["Giving users the minimum access necessary to perform their job", "Giving users maximum access", "Giving users no access", "Giving users access to everything"],
        correctAnswer: 0,
        explanation: "The principle of least privilege is the practice of limiting access rights for users to the bare minimum permissions they need to perform their work."
      }
    ]
  }
};

// POST /api/quiz-generator/generate - Generate a quiz with chain pattern difficulty
router.post('/generate',
  [
    body('subject').notEmpty().withMessage('Subject is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('createdBy').optional().isInt().withMessage('Created by must be an integer')
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { subject, category, createdBy } = req.body;

      // Check if subject exists in templates
      if (!quizTemplates[subject]) {
        return res.status(400).json({ error: 'Invalid subject' });
      }

      // Create quiz
      const quizId = await createQuiz({
        subject,
        category,
        title: `${subject} - ${category} Quiz`,
        description: `A quiz on ${subject} with progressive difficulty`,
        difficultyLevel: 'mixed',
        createdBy
      });

      // Add questions in chain pattern: 3 easy, 3 medium, 3 hard, 3 very hard
      const difficulties = ['easy', 'medium', 'hard', 'veryHard'];

      for (const difficulty of difficulties) {
        const questions = quizTemplates[subject][difficulty];

        for (const question of questions) {
          await createQuizQuestion({
            quizId,
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            difficulty
          });
        }
      }

      const quiz = await getQuizById(quizId);
      const quizQuestions = await getQuestionsByQuizId(quizId);

      res.status(201).json({
        ...quiz,
        questions: quizQuestions
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      res.status(500).json({ error: 'Failed to generate quiz' });
    }
  }
);

module.exports = router;
