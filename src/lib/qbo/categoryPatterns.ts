
import { CategoryPattern, LocationPattern, CategoryHierarchy } from './types';

// Define common merchant patterns for better categorization
export const categoryPatterns: CategoryPattern[] = [
  // Food & Dining - More specific patterns
  { pattern: /\b(restaurant|café|cafe|coffee|starbucks|mcdonald|burger|pizza|taco|dining|chipotle|panera|subway|wendys|applebees|ihop|denny|chilis|olive garden|red lobster)\b/i, category: "Food & Dining", subcategory: "Restaurants" },
  { pattern: /\b(grocery|market|food store|supermarket|walmart|target|costco|trader|wholefood|kroger|safeway|publix|aldi|lidl|wegmans|albertsons)\b/i, category: "Food & Dining", subcategory: "Groceries" },
  { pattern: /\b(doordash|ubereats|grubhub|seamless|postmates|instacart)\b/i, category: "Food & Dining", subcategory: "Food Delivery" },
  { pattern: /\b(bakery|dessert|ice cream|yogurt)\b/i, category: "Food & Dining", subcategory: "Restaurants" },
  
  // Entertainment - More specific patterns
  { pattern: /\b(netflix|hulu|disney\+|hbo|spotify|apple music|youtube|prime|peacock|paramount|tidal|deezer|pandora)\b/i, category: "Entertainment", subcategory: "Streaming Services" },
  { pattern: /\b(movie|cinema|theatre|theater|amc|regal|cinemark|concert|ticket|stubhub|ticketmaster|fandango|eventbrite)\b/i, category: "Entertainment", subcategory: "Movies & Events" },
  { pattern: /\b(game|steam|playstation|xbox|nintendo|epic games|ea|ubisoft|blizzard|riot|activision)\b/i, category: "Entertainment", subcategory: "Games" },
  { pattern: /\b(patreon|facebook|meta|onlyfans|twitch|cameo)\b/i, category: "Entertainment", subcategory: "Social Media & Creators" },
  
  // Transportation - More specific patterns
  { pattern: /\b(uber|lyft|taxi|cab|rideshare|ride share)\b/i, category: "Transportation", subcategory: "Ride Sharing" },
  { pattern: /\b(train|subway|metro|transit|bus|amtrak|mta|bart|cta)\b/i, category: "Transportation", subcategory: "Public Transit" },
  { pattern: /\b(airline|flight|delta|united|american|southwest|jetblue|spirit|frontier|alaska|british airways|air canada)\b/i, category: "Transportation", subcategory: "Air Travel" },
  { pattern: /\b(gas|shell|exxon|mobil|chevron|bp|marathon|valero|sunoco|speedway|76|circle k)\b/i, category: "Transportation", subcategory: "Gas & Fuel" },
  { pattern: /\b(parking|toll|bridge|highway|garage|lot|meter)\b/i, category: "Transportation", subcategory: "Parking & Tolls" },
  
  // Shopping - More specific patterns
  { pattern: /\b(amazon|ebay|etsy|wayfair|bestbuy|aliexpress|walmart\.com|target\.com|overstock|newegg|wish|zappos)\b/i, category: "Shopping", subcategory: "Online Shopping" },
  { pattern: /\b(clothing|apparel|fashion|zara|h&m|gap|old navy|marshalls|tj ?maxx|ross|kohls|macys|nordstrom|forever 21|american eagle)\b/i, category: "Shopping", subcategory: "Clothing & Fashion" },
  { pattern: /\b(electronic|tech|gadget|phone|laptop|computer|tablet|headphone|tv|audio|camera)\b/i, category: "Shopping", subcategory: "Electronics" },
  
  // Health & Fitness - More specific patterns
  { pattern: /\b(gym|fitness|peloton|nike|adidas|workout|sport|planet fitness|equinox|la fitness|ymca|crunch|gold's|lifetime|crossfit)\b/i, category: "Health & Fitness", subcategory: "Gym & Fitness" },
  { pattern: /\b(doctor|physician|medical|clinic|hospital|healthcare|specialist|pediatrician|dentist|orthodontist|dermatologist|optometrist)\b/i, category: "Health & Fitness", subcategory: "Medical Services" },
  { pattern: /\b(pharmacy|prescription|medication|medicine|drug|cvs|walgreens|rite aid|duane reade|rx)\b/i, category: "Health & Fitness", subcategory: "Pharmacy" },
  
  // Housing - More specific patterns with stronger word boundaries
  { pattern: /\b(rent|mortgage|loan payment|apartment|condo|house payment|housing|lease payment|tenant|landlord)\b/i, category: "Housing", subcategory: "Rent/Mortgage" },
  { pattern: /\b(lease)\b.*\b(apartment|home|house|property|real estate)\b/i, category: "Housing", subcategory: "Rent/Mortgage" },
  { pattern: /\b(electric|gas bill|water bill|sewer|utility|power|energy|pg&e|con edison|national grid|duke energy)\b/i, category: "Housing", subcategory: "Utilities" },
  { pattern: /\b(internet|cable|phone bill|cell service|mobile service|broadband|wifi|verizon|at&t|t-mobile|sprint|xfinity|spectrum|cox|dish|directv)\b/i, category: "Housing", subcategory: "Internet & Phone" },
  { pattern: /\b(home depot|lowes|ikea|wayfair|overstock|furniture|appliance|renovation|repair|maintenance|plumber|electrician)\b/i, category: "Housing", subcategory: "Home Improvement" },
  
  // Insurance - More specific patterns
  { pattern: /\b(insurance|policy|premium|coverage|geico|allstate|statefarm|progressive|liberty|nationwide|farmers|usaa)\b/i, category: "Insurance", subcategory: "General Insurance" },
  { pattern: /\b(health insurance|medical insurance|dental insurance|vision insurance|healthcare premium|aetna|cigna|humana|bluecross|anthem|united healthcare)\b/i, category: "Insurance", subcategory: "Health Insurance" },
  { pattern: /\b(car insurance|auto insurance|vehicle insurance)\b/i, category: "Insurance", subcategory: "Auto Insurance" },
  { pattern: /\b(life insurance|disability insurance)\b/i, category: "Insurance", subcategory: "Life & Disability Insurance" },
  
  // Income - More specific patterns
  { pattern: /\b(salary|payroll|direct deposit|deposit|employment|wage|paycheck|income)\b/i, category: "Income", subcategory: "Salary" },
  { pattern: /\b(dividend|interest|investment income|capital gain|stock|bond|etf|mutual fund|retirement)\b/i, category: "Income", subcategory: "Investment Income" },
  { pattern: /\b(freelance|contract|consulting|gig|client payment|self-employed|business income)\b/i, category: "Income", subcategory: "Self-Employment" },
  { pattern: /\b(refund|rebate|cashback|reimbursement|return)\b/i, category: "Income", subcategory: "Refunds & Reimbursements" },
  
  // Technology - More specific patterns
  { pattern: /\b(anthropic|claude\.ai|chatgpt|openai|ai service|github|gitlab|stackoverflow|digitalocean|notion)\b/i, category: "Technology", subcategory: "Software & Services" },
  { pattern: /\b(apple|microsoft|google|aws|amazon web services|cloud|hosting|domain|server|storage)\b/i, category: "Technology", subcategory: "Tech Services" },
  
  // Education - More specific patterns
  { pattern: /\b(tuition|student|education|school|college|university|course|class|training|workshop|udemy|coursera|edx|skillshare|masterclass)\b/i, category: "Education", subcategory: "Education & Courses" },
  { pattern: /\b(book|textbook|ebook|kindle|audible|amazon books|barnes|noble)\b/i, category: "Education", subcategory: "Books & Learning Materials" },
  
  // Personal Care - More specific patterns
  { pattern: /\b(haircut|salon|spa|massage|nail|beauty|barber|stylist|cosmetic|makeup|skincare)\b/i, category: "Personal Care", subcategory: "Personal Care Services" },
  { pattern: /\b(sephora|ulta|bath & body works|lush|perfume|cologne|grooming)\b/i, category: "Personal Care", subcategory: "Personal Care Products" },
  
  // Children - More specific patterns
  { pattern: /\b(childcare|daycare|babysitter|nanny|kids|children|toys|games|child support)\b/i, category: "Children", subcategory: "Childcare & Support" },
  
  // Travel - More specific patterns
  { pattern: /\b(hotel|airbnb|vrbo|lodging|accommodation|marriott|hilton|hyatt|holiday inn|booking\.com|expedia|travelocity|tripadvisor)\b/i, category: "Travel", subcategory: "Accommodation" },
  { pattern: /\b(vacation|resort|cruise|tour|travel agent|all-inclusive)\b/i, category: "Travel", subcategory: "Vacations & Travel" },
  
  // Financial - More specific patterns
  { pattern: /\b(fee|service charge|overdraft|atm fee|bank fee|transfer fee|foreign transaction|membership fee|annual fee)\b/i, category: "Financial", subcategory: "Fees & Charges" },
  { pattern: /\b(credit card payment|loan payment|debt|financing|interest payment)\b/i, category: "Financial", subcategory: "Debt Payments" },
  { pattern: /\b(investment|broker|vanguard|fidelity|schwab|robinhood|etrade|td ameritrade|wealthfront|betterment)\b/i, category: "Financial", subcategory: "Investments" },
  { pattern: /\b(tax|irs|state tax|property tax|tax payment|turbotax|h&r block)\b/i, category: "Financial", subcategory: "Taxes" },
  
  // Charity & Gifts - More specific patterns
  { pattern: /\b(donation|charity|nonprofit|charitable|red cross|united way|salvation army|goodwill|unicef|aclu|peta)\b/i, category: "Charity & Gifts", subcategory: "Charitable Donations" },
  { pattern: /\b(gift|present|card|flowers|1800flowers|ftd|edible arrangements)\b/i, category: "Charity & Gifts", subcategory: "Gifts" },
  
  // Business Expenses - More specific patterns
  { pattern: /\b(business expense|office supply|staples|office depot|business service|professional)\b/i, category: "Business", subcategory: "Business Expenses" },
  
  // Pets - More specific patterns
  { pattern: /\b(pet|dog|cat|veterinarian|vet|animal|petco|petsmart|chewy)\b/i, category: "Pets", subcategory: "Pet Care" },
  
  // Credit Card - Specific pattern for credit card payments
  { pattern: /\b((?:credit card)|(?:credit ?crd)).*(?:payment|pymt)\b/i, category: "Financial", subcategory: "Debt Payments" },
  
  // Specific payment pattern for PayPal
  { pattern: /paypal.*?payment/i, category: "Financial", subcategory: "Online Payments" },
];

// Common location patterns in transaction descriptions
export const locationPatterns: LocationPattern[] = [
  { pattern: /\b([A-Z]{2})\b/, extract: (match: RegExpMatchArray) => match[1] }, // State codes like CA, NY
  { pattern: /#([0-9]{5})/, extract: (match: RegExpMatchArray) => match[1] },  // Zip codes
  { pattern: /([A-Za-z]+ ?[A-Za-z]*) (TX|CA|NY|FL|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|DC|VT|WY)/, extract: (match: RegExpMatchArray) => `${match[1]}, ${match[2]}` },  // City and state
];

// Define structured category hierarchy for Claude to use
export const categoryHierarchy: CategoryHierarchy[] = [
  {
    name: "Food & Dining",
    subcategories: ["Groceries", "Restaurants", "Fast Food", "Coffee Shops", "Food Delivery", "Alcohol & Bars"],
    examples: ["Safeway", "Trader Joe's", "Chipotle", "Starbucks", "Cheesecake Factory", "DoorDash", "UberEats"],
    isExpense: true
  },
  {
    name: "Housing",
    subcategories: ["Mortgage", "Rent", "Home Insurance", "Property Tax", "Utilities", "Home Maintenance", "Home Improvement", "Home Supplies", "Internet & Cable", "Security"],
    examples: ["Apartment Rent", "Wells Fargo Mortgage", "PG&E", "AT&T Internet", "Comcast", "Home Depot", "ADT Security"],
    isExpense: true
  },
  {
    name: "Transportation",
    subcategories: ["Gas & Fuel", "Auto Insurance", "Auto Payment", "Auto Maintenance", "Parking", "Public Transit", "Ride Sharing", "Air Travel", "Car Rental"],
    examples: ["Shell", "GEICO", "Toyota Financial", "Jiffy Lube", "BART", "Uber", "Southwest Airlines", "Hertz"],
    isExpense: true
  },
  {
    name: "Entertainment",
    subcategories: ["Streaming Services", "Movies & Events", "Games", "Social Media", "Hobbies", "Music", "Books & Magazines"],
    examples: ["Netflix", "AMC Theaters", "Ticketmaster", "Steam", "PlayStation", "Spotify", "Apple Music", "Amazon Kindle"],
    isExpense: true
  },
  {
    name: "Shopping",
    subcategories: ["Clothing", "Electronics", "Online Shopping", "Department Stores", "Home Furnishings", "Sporting Goods"],
    examples: ["Amazon", "Best Buy", "Walmart", "Target", "Macy's", "Nike", "IKEA", "REI"],
    isExpense: true
  },
  {
    name: "Health & Fitness",
    subcategories: ["Gym", "Pharmacy", "Doctor", "Dental", "Vision", "Health Insurance", "Mental Health", "Sports"],
    examples: ["Planet Fitness", "CVS", "Kaiser Permanente", "Delta Dental", "VSP Vision", "Blue Cross", "Therapist", "Sports Equipment"],
    isExpense: true
  },
  {
    name: "Personal Care",
    subcategories: ["Hair & Beauty", "Spa & Massage", "Laundry", "Grooming", "Cosmetics"],
    examples: ["Great Clips", "Sephora", "Massage Envy", "Laundromat", "Ulta Beauty"],
    isExpense: true
  },
  {
    name: "Education",
    subcategories: ["Tuition", "Books & Supplies", "Student Loans", "Courses", "Activities"],
    examples: ["University Tuition", "Sallie Mae", "Chegg", "Coursera", "Udemy", "After-school program"],
    isExpense: true
  },
  {
    name: "Travel",
    subcategories: ["Flights", "Hotels", "Vacation", "Rental Cars", "Cruises", "Travel Insurance", "Activities"],
    examples: ["Delta Airlines", "Marriott", "Airbnb", "Hertz", "Carnival Cruise", "Allianz Travel", "Excursion"],
    isExpense: true
  },
  {
    name: "Financial",
    subcategories: ["Credit Card Payment", "Loan Payment", "Bank Fees", "Financial Advisor", "Investments", "Taxes", "Life Insurance", "Online Payments"],
    examples: ["Chase Credit Card", "Citibank Loan", "ATM Fee", "E*TRADE", "Schwab", "IRS", "State Tax Board", "Northwestern Mutual", "PayPal Payment"],
    isExpense: true
  },
  {
    name: "Children",
    subcategories: ["Childcare", "Activities", "Toys", "Child Support", "Baby Supplies", "School Expenses"],
    examples: ["Daycare", "Toys R Us", "Child Support Payment", "Diapers", "School Supplies", "Tutoring"],
    isExpense: true
  },
  {
    name: "Pets",
    subcategories: ["Food", "Supplies", "Vet & Medicine", "Grooming", "Training"],
    examples: ["PetSmart", "Pet Food", "Veterinarian", "Pet Medication", "Doggie Daycare"],
    isExpense: true
  },
  {
    name: "Business",
    subcategories: ["Office Supplies", "Advertising", "Legal", "Shipping", "Software", "Travel", "Meals", "Rent", "Contractor"],
    examples: ["Office Depot", "Facebook Ads", "Google Ads", "Legal Zoom", "QuickBooks", "Business Trip", "Client Dinner"],
    isExpense: true
  },
  {
    name: "Taxes",
    subcategories: ["Federal Tax", "State Tax", "Property Tax", "Sales Tax", "Tax Preparation"],
    examples: ["IRS Payment", "State Tax Board", "County Property Tax", "H&R Block", "TurboTax"],
    isExpense: true
  },
  {
    name: "Charity & Gifts",
    subcategories: ["Donations", "Gifts", "Nonprofit Support"],
    examples: ["Red Cross", "Church Donation", "Birthday Gift", "Holiday Gift", "Wedding Gift", "ASPCA"],
    isExpense: true
  },
  {
    name: "Technology",
    subcategories: ["Software & Services", "Hardware", "Hosting", "AI Services", "Cloud Storage"],
    examples: ["Microsoft 365", "Adobe", "Dropbox", "Apple", "ChatGPT Plus", "Claude.ai", "AWS", "GitHub"],
    isExpense: true
  },
  {
    name: "Income",
    subcategories: ["Salary", "Investment Income", "Reimbursements", "Tax Refund", "Side Hustle", "Rental Income", "Gifts Received"],
    examples: ["Employer Payroll", "Dividend Payment", "Interest Income", "Expense Reimbursement", "IRS Refund", "Freelance Payment", "Rent from Tenant"],
    isIncome: true
  },
  {
    name: "Transfers",
    subcategories: ["Account Transfer", "Cash Withdrawal", "Deposit", "Investment Transfer", "Savings Transfer"],
    examples: ["Transfer to Savings", "ATM Withdrawal", "Check Deposit", "Transfer to Investment Account", "Transfer to Checking"],
    isTransfer: true
  }
];
