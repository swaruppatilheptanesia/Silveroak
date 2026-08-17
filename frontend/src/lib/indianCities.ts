/**
 * Curated India State/UT → major cities map, used to make the NOC create-form City
 * dropdown cascade from the selected State. Keys MUST match the strings in
 * `INDIAN_STATES` ([indianStates.ts]) exactly. This is intentionally NOT exhaustive —
 * the City field offers an "Other" free-text escape for anything not listed here.
 */
export const INDIAN_STATE_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati',
    'Kadapa', 'Kakinada', 'Anantapur', 'Eluru', 'Ongole', 'Chittoor', 'Vizianagaram', 'Machilipatnam',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Tezu', 'Along', 'Roing',
  ],
  Assam: [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon',
    'Dhubri', 'Karimganj', 'Sivasagar', 'Goalpara', 'Barpeta', 'North Lakhimpur',
  ],
  Bihar: [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai',
    'Katihar', 'Chapra', 'Munger', 'Bihar Sharif', 'Hajipur', 'Sasaram', 'Motihari', 'Siwan',
  ],
  Chhattisgarh: [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh',
    'Ambikapur', 'Dhamtari', 'Mahasamund', 'Bhatapara',
  ],
  Goa: [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Cuncolim', 'Canacona',
  ],
  Gujarat: [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh',
    'Anand', 'Nadiad', 'Morbi', 'Mehsana', 'Bharuch', 'Vapi', 'Navsari', 'Gandhidham', 'Porbandar',
    'Palanpur', 'Valsad', 'Surendranagar',
  ],
  Haryana: [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal',
    'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Kaithal', 'Rewari',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Kullu', 'Bilaspur', 'Hamirpur', 'Una', 'Nahan',
    'Palampur', 'Chamba', 'Kangra', 'Baddi',
  ],
  Jharkhand: [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh', 'Giridih',
    'Ramgarh', 'Phusro', 'Medininagar', 'Chaibasa', 'Dumka',
  ],
  Karnataka: [
    'Bengaluru', 'Mysuru', 'Hubli-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere',
    'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Raichur', 'Bidar', 'Hassan', 'Udupi',
    'Chitradurga', 'Kolar', 'Mandya',
  ],
  Kerala: [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha',
    'Palakkad', 'Malappuram', 'Kottayam', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Wayanad',
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam',
    'Rewa', 'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Chhindwara', 'Vidisha', 'Shivpuri',
  ],
  Maharashtra: [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur',
    'Navi Mumbai', 'Sangli', 'Jalgaon', 'Akola', 'Latur', 'Ahmednagar', 'Nanded', 'Chandrapur',
    'Dhule', 'Satara', 'Ratnagiri',
  ],
  Manipur: [
    'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Ukhrul', 'Senapati', 'Jiribam',
  ],
  Meghalaya: [
    'Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Williamnagar', 'Baghmara', 'Nongpoh', 'Resubelpara',
  ],
  Mizoram: [
    'Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Saiha', 'Mamit', 'Lawngtlai',
  ],
  Nagaland: [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek',
  ],
  Odisha: [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Baripada',
    'Bhadrak', 'Jharsuguda', 'Jeypore', 'Angul', 'Dhenkanal', 'Barbil',
  ],
  Punjab: [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Pathankot',
    'Moga', 'Batala', 'Firozpur', 'Kapurthala', 'Phagwara', 'Barnala', 'Sangrur',
  ],
  Rajasthan: [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar',
    'Pali', 'Sri Ganganagar', 'Bharatpur', 'Chittorgarh', 'Tonk', 'Beawar', 'Hanumangarh',
  ],
  Sikkim: [
    'Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo', 'Singtam', 'Jorethang',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur',
    'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Nagercoil', 'Kancheepuram',
    'Karur', 'Cuddalore', 'Hosur', 'Sivakasi',
  ],
  Telangana: [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar',
    'Nalgonda', 'Adilabad', 'Suryapet', 'Siddipet', 'Miryalaguda', 'Secunderabad',
  ],
  Tripura: [
    'Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar', 'Belonia', 'Ambassa', 'Khowai', 'Teliamura',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Bareilly',
    'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Firozabad', 'Jhansi', 'Mathura', 'Ayodhya',
    'Muzaffarnagar', 'Rampur', 'Jaunpur', 'Greater Noida',
  ],
  Uttarakhand: [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital',
    'Mussoorie', 'Pithoragarh', 'Kotdwar', 'Almora',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Kharagpur',
    'Haldia', 'Krishnanagar', 'Darjeeling', 'Jalpaiguri', 'Cooch Behar', 'Berhampore', 'Bankura',
  ],
  'Andaman and Nicobar Islands': [
    'Port Blair', 'Diglipur', 'Rangat', 'Mayabunder', 'Car Nicobar',
  ],
  Chandigarh: ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': [
    'Silvassa', 'Daman', 'Diu',
  ],
  Delhi: [
    'New Delhi', 'Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka',
    'Rohini', 'Pitampura', 'Karol Bagh', 'Saket', 'Janakpuri',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua', 'Sopore', 'Kupwara', 'Pulwama',
  ],
  Ladakh: ['Leh', 'Kargil'],
  Lakshadweep: ['Kavaratti', 'Agatti', 'Amini', 'Andrott'],
  Puducherry: ['Puducherry', 'Karaikal', 'Yanam', 'Mahe', 'Oulgaret'],
};

/** Cities for a state/UT (empty when the state is unmapped or not selected). */
export function getCitiesForState(state: string): string[] {
  return INDIAN_STATE_CITIES[state] ?? [];
}
