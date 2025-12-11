from flask import Flask, request, jsonify
from qiskit import IBMQ, QuantumCircuit, execute

app = Flask(__name__)

@app.route('/api/connect-qiskit', methods=['POST'])
def run_quantum_job():
    token = request.json.get('token')
    # 1. Load Account
    IBMQ.save_account(token, overwrite=True)
    IBMQ.load_account()
    provider = IBMQ.get_provider(hub='ibm-q')

    # 2. Get Real Backend
    backend = provider.get_backend('ibmq_manila')

    # 3. Create Circuit (The "- -" Logic)
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    qc.measure_all()

    # 4. Run Job
    job = execute(qc, backend, shots=1024)
    result = job.result()

    return jsonify({"status": "SUCCESS", "counts": result.get_counts()})

if __name__ == '__main__':
    app.run(port=5000)
