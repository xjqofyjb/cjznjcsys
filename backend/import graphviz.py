import graphviz

# Create Digraph
dot = graphviz.Digraph('PE-DSTGN_Flowchart', comment='PE-DSTGN Framework')
dot.attr(rankdir='TB', size='10,12', compound='true', newrank='true')

# Node Styles
dot.attr('node', shape='box', style='filled', fontname='Sans-Serif', fontsize='10')

# 1. Data Layer
with dot.subgraph(name='cluster_0') as c:
    c.attr(label='Layer 1: Data Input & Preprocessing', color='lightgrey', style='dashed')
    c.node('D1', 'AIS Trajectory\n(Location, Speed)', fillcolor='#FFF3E0')
    c.node('D2', 'Hydro Data\n(Water Level, Flow)', fillcolor='#FFF3E0')
    c.node('D3', 'Lock Data\n(Queue Size)', fillcolor='#FFF3E0')
    c.node('D4', 'Facility Info\n(Berth Voltage)', fillcolor='#FFF3E0')
    c.node('DP', 'Data Preprocessing\n(Kalman Filter, Alignment)', fillcolor='#FFE0B2')
    
    c.edges([('D1', 'DP'), ('D2', 'DP'), ('D3', 'DP'), ('D4', 'DP')])

# 2. PFE Layer
with dot.subgraph(name='cluster_1') as c:
    c.attr(label='Layer 2: Physics Feature Encoding (PFE)', color='gold', style='dashed')
    c.node('PFE1', 'Node Features\n(H_water, L_safe)', fillcolor='#F0F4C3')
    c.node('PFE2', 'Edge Weights\n(Hydro-dynamics, Queue Time)', fillcolor='#F0F4C3')
    c.node('Graph', 'Dynamic Graph\nConstruction A(t)', fillcolor='#DCE775')
    c.node('Prior', 'Physics Prior ETA\n(T_physics)', fillcolor='#DCE775')
    
    # Internal edges
    c.edge('PFE1', 'Graph')
    c.edge('PFE2', 'Graph')
    c.edge('Graph', 'Prior')

# 3. Prediction Layer
with dot.subgraph(name='cluster_2') as c:
    c.attr(label='Layer 3: Residual ST-GCN Prediction', color='purple', style='dashed')
    c.node('STGCN', 'ST-GCN Blocks\n(GCN + TCN)', fillcolor='#E1BEE7')
    c.node('Attn', 'HDA Attention\n(Decision-Context Aware)', fillcolor='#CE93D8')
    c.node('Res', 'Neural Residual\n(Delta T_neural)', fillcolor='#BA68C8')
    c.node('Final', 'Final Prediction\n(T_pred = T_phy + Delta T)', fillcolor='#AB47BC', fontcolor='white')
    
    c.edge('STGCN', 'Attn')
    c.edge('Attn', 'Res')

# 4. Decision Layer
with dot.subgraph(name='cluster_3') as c:
    c.attr(label='Layer 4: Constraint-Aware Optimization (SPO+)', color='blue', style='dashed')
    c.node('MILP', 'MILP Formulation\n(Min Cost + Phys Constraints)', fillcolor='#B3E5FC')
    
    # Training Branch
    c.node('Relax', 'Training: LP Relaxation\n(x in [0,1])', fillcolor='#81D4FA')
    c.node('Diff', 'Diff. Opt Layer\n(cvxpylayers)', fillcolor='#4FC3F7')
    c.node('Loss', 'Joint Loss\n(SPO+ Loss)', fillcolor='#29B6F6')
    
    # Testing Branch
    c.node('Solve', 'Testing: Exact Solver\n(Gurobi/CPLEX)', fillcolor='#039BE5', fontcolor='white')
    
    c.edge('MILP', 'Relax', style='dashed', label='Train')
    c.edge('Relax', 'Diff')
    c.edge('Diff', 'Loss')
    c.edge('MILP', 'Solve', style='bold', label='Test')

# 5. Output Layer
with dot.subgraph(name='cluster_4') as c:
    c.attr(label='Layer 5: Output & Evaluation', color='red', style='dashed')
    c.node('Out1', 'Ship Arrival Schedule', fillcolor='#FFCDD2')
    c.node('Out2', 'Shore Power Allocation', fillcolor='#EF9A9A')
    c.node('Metrics', 'Metrics:\nRegret, Wait Time, Carbon', fillcolor='#E57373')
    
    c.edge('Out1', 'Metrics')
    c.edge('Out2', 'Metrics')

# Cross-layer edges
dot.edge('DP', 'PFE1')
dot.edge('DP', 'PFE2')
dot.edge('Prior', 'Final')
dot.edge('Graph', 'STGCN')
dot.edge('Res', 'Final')
dot.edge('Final', 'MILP')
dot.edge('Loss', 'STGCN', style='dotted', label='Backprop')
dot.edge('Solve', 'Out1')
dot.edge('Solve', 'Out2')

# Render
dot.render('pe_dstgn_flowchart', format='png', cleanup=True)
print("Flowchart generated successfully.")