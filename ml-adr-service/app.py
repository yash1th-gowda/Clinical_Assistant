from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
import pickle
import os

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

# Browser access is disabled unless explicit trusted origins are configured.
allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ADR_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
if allowed_origins:
    CORS(app, origins=allowed_origins)

# Drug class mapping - maps specific drugs to their classes
DRUG_CLASSES = {
    # Penicillin antibiotics
    'amoxicillin': ['penicillin', 'beta-lactam', 'antibiotic'],
    'ampicillin': ['penicillin', 'beta-lactam', 'antibiotic'],
    'penicillin': ['penicillin', 'beta-lactam', 'antibiotic'],
    'penicillin g': ['penicillin', 'beta-lactam', 'antibiotic'],
    'penicillin v': ['penicillin', 'beta-lactam', 'antibiotic'],
    'oxacillin': ['penicillin', 'beta-lactam', 'antibiotic'],
    'dicloxacillin': ['penicillin', 'beta-lactam', 'antibiotic'],
    
    # Cephalosporins (cross-reactivity with penicillin)
    'cephalexin': ['cephalosporin', 'beta-lactam', 'antibiotic'],
    'cefuroxime': ['cephalosporin', 'beta-lactam', 'antibiotic'],
    'ceftriaxone': ['cephalosporin', 'beta-lactam', 'antibiotic'],
    'cefixime': ['cephalosporin', 'beta-lactam', 'antibiotic'],
    
    # NSAIDs
    'ibuprofen': ['nsaid', 'anti-inflammatory'],
    'aspirin': ['nsaid', 'antiplatelet', 'anti-inflammatory'],
    'naproxen': ['nsaid', 'anti-inflammatory'],
    'diclofenac': ['nsaid', 'anti-inflammatory'],
    
    # Sulfa drugs
    'sulfamethoxazole': ['sulfonamide', 'antibiotic'],
    'trimethoprim': ['antibiotic'],
    
    # Other common drugs
    'paracetamol': ['analgesic', 'antipyretic'],
    'acetaminophen': ['analgesic', 'antipyretic'],
    'metformin': ['antidiabetic', 'biguanide'],
    'warfarin': ['anticoagulant'],
    'lisinopril': ['ace-inhibitor', 'antihypertensive'],
}

class ADRPredictor:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.is_trained = False
        self.load_or_train_model()
    
    def load_or_train_model(self):
        try:
            with open('adr_model.pkl', 'rb') as f:
                self.model = pickle.load(f)
            with open('vectorizer.pkl', 'rb') as f:
                self.vectorizer = pickle.load(f)
            self.is_trained = True
        except FileNotFoundError:
            self.train_model()
    
    def train_model(self):
        training_data = [
            ("warfarin aspirin", "high", "Increased bleeding risk"),
            ("warfarin ibuprofen", "high", "Severe bleeding risk"),
            ("metformin alcohol", "medium", "Lactic acidosis risk"),
            ("lisinopril potassium", "medium", "Hyperkalemia risk"),
            ("digoxin furosemide", "high", "Digitalis toxicity"),
            ("aspirin methotrexate", "medium", "Increased toxicity"),
            ("paracetamol ibuprofen", "low", "Minimal interaction"),
            ("metformin lisinopril", "low", "Generally safe"),
            ("paracetamol metformin", "safe", "No interaction"),
            # Add more interactions here
            ("ibuprofen naproxen", "high", "Increased GI bleeding risk"),
            ("acetaminophen alcohol", "high", "Liver damage risk"),
            ("penicillin milk", "high", "Allergic reaction risk"),
        ]
        
        X = [item[0] for item in training_data]
        y = [item[1] for item in training_data]
        
        X_vectorized = self.vectorizer.fit_transform(X)
        self.model.fit(X_vectorized, y)
        self.is_trained = True
        
        with open('adr_model.pkl', 'wb') as f:
            pickle.dump(self.model, f)
        with open('vectorizer.pkl', 'wb') as f:
            pickle.dump(self.vectorizer, f)
    
    def get_drug_classes(self, drug_name):
        """Get all drug classes for a given drug"""
        drug_lower = drug_name.lower().strip()
        return DRUG_CLASSES.get(drug_lower, [])
    
    def check_allergy_match(self, drug_name, allergy):
        """Check if a drug matches an allergy (including drug class matching)"""
        drug_lower = drug_name.lower().strip()
        allergy_lower = allergy.lower().strip()
        
        # Direct name match
        if drug_lower == allergy_lower:
            return True, "exact_match"
        
        # Check if drug name contains allergy term
        if allergy_lower in drug_lower or drug_lower in allergy_lower:
            return True, "partial_match"
        
        # Check drug classes
        drug_classes = self.get_drug_classes(drug_lower)
        allergy_classes = self.get_drug_classes(allergy_lower)
        
        # If allergy is a class name, check if drug belongs to that class
        if allergy_lower in drug_classes:
            return True, "class_match"
        
        # Check for cross-reactivity (e.g., penicillin and cephalosporin)
        if 'penicillin' in allergy_classes or allergy_lower == 'penicillin':
            if 'penicillin' in drug_classes:
                return True, "penicillin_allergy"
            # 10% cross-reactivity between penicillin and cephalosporins
            if 'cephalosporin' in drug_classes:
                return True, "cross_reactivity_warning"
        
        return False, None
    
    def predict_interaction(self, drug1, drug2):
        if not self.is_trained:
            return {"severity": "unknown", "confidence": 0.0}
        
        input_text = f"{drug1.lower()} {drug2.lower()}"
        X_input = self.vectorizer.transform([input_text])
        
        prediction = self.model.predict(X_input)[0]
        probabilities = self.model.predict_proba(X_input)[0]
        confidence = max(probabilities)
        
        return {
            "severity": prediction,
            "confidence": float(confidence),
            "message": f"Interaction between {drug1} and {drug2}: {prediction} risk"
        }
    
    def check_multiple_drugs(self, medications, patient_data):
        interactions = []
        
        # Check drug-drug interactions
        for i in range(len(medications)):
            for j in range(i + 1, len(medications)):
                drug1 = medications[i].get('name', '')
                drug2 = medications[j].get('name', '')
                
                if drug1 and drug2:
                    result = self.predict_interaction(drug1, drug2)
                    
                    if result['severity'] in ['high', 'medium'] and result['confidence'] > 0.5:
                        interactions.append({
                            'type': 'drug_interaction',
                            'severity': result['severity'],
                            'medications': [drug1, drug2],
                            'message': result['message'],
                            'confidence': result['confidence'],
                            'recommendation': 'Monitor patient closely'
                        })
        
        # Check drug-allergy interactions (with drug class matching)
        if 'allergies' in patient_data and patient_data['allergies']:
            for med in medications:
                drug_name = med.get('name', '')
                if not drug_name:
                    continue
                
                for allergy in patient_data['allergies']:
                    is_match, match_type = self.check_allergy_match(drug_name, allergy)
                    
                    if is_match:
                        severity = 'high'
                        recommendation = 'Discontinue immediately and consult physician'
                        
                        if match_type == 'cross_reactivity_warning':
                            severity = 'medium'
                            recommendation = 'Use with caution - possible cross-reactivity. Monitor closely.'
                            message = f"⚠️ Cross-reactivity warning: Patient allergic to {allergy}. {drug_name} is a cephalosporin with ~10% cross-reactivity risk with penicillin."
                        elif match_type == 'class_match':
                            message = f"🚨 ALLERGY ALERT: Patient allergic to {allergy}. {drug_name} belongs to the same drug class."
                        elif match_type == 'penicillin_allergy':
                            message = f"🚨 PENICILLIN ALLERGY: Patient allergic to penicillin. {drug_name} is a penicillin-based antibiotic."
                        elif match_type == 'exact_match':
                            message = f"🚨 DIRECT ALLERGY: Patient is allergic to {drug_name}"
                        else:
                            message = f"⚠️ ALLERGY WARNING: Patient allergic to {allergy}, which may be related to {drug_name}"
                        
                        interactions.append({
                            'type': 'allergy',
                            'severity': severity,
                            'medications': [drug_name],
                            'allergy': allergy,
                            'match_type': match_type,
                            'message': message,
                            'confidence': 1.0 if match_type in ['exact_match', 'class_match', 'penicillin_allergy'] else 0.9,
                            'recommendation': recommendation
                        })
        
        return interactions

predictor = ADRPredictor()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_trained": predictor.is_trained})

@app.route('/predict-adr', methods=['POST'])
def predict_adr():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    medications = data.get('medications', [])
    patient_data = data.get('patient', {})
    if not isinstance(medications, list) or len(medications) > 100:
        return jsonify({"error": "medications must be a list of at most 100 items"}), 400
    if not isinstance(patient_data, dict):
        return jsonify({"error": "patient must be a JSON object"}), 400
    if any(
        not isinstance(medication, dict)
        or not isinstance(medication.get('name'), str)
        or not medication.get('name').strip()
        for medication in medications
    ):
        return jsonify({"error": "Each medication must include a non-empty name"}), 400
    if not isinstance(patient_data.get('allergies', []), list):
        return jsonify({"error": "patient.allergies must be a list"}), 400

    try:
        interactions = predictor.check_multiple_drugs(medications, patient_data)
        return jsonify({
            "success": True,
            "interactions": interactions,
            "total_interactions": len(interactions)
        })
    except Exception:
        app.logger.exception("ADR prediction request failed")
        return jsonify({"error": "ADR prediction failed"}), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', '6001')),
        debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    )