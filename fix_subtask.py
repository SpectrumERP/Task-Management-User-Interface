import re

with open('src/components/task/TaskForm.tsx', 'r') as f:
    content = f.read()

# We want to replace the block starting at `                {subtasks.filter(st => !subtaskFields.some(sf => sf.operTaskNo === st.taskNo)).length > 0 ? (`
# and ending at `                )}` right before `              </div>` of `Checklist`

start_marker = "                {subtasks.filter(st => !subtaskFields.some(sf => sf.operTaskNo === st.taskNo)).length > 0 ? ("
end_marker = "                  </div>\n                )}"

start_idx = content.find(start_marker)

# Find the next `              </div>\n            ))}`
end_idx = content.find("              </div>\n            ))}", start_idx)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    exit(1)

block = content[start_idx:end_idx]

# Let's extract the edit template from the block
edit_start = block.find("<motion.div")
edit_end = block.find("</motion.div>", edit_start) + len("</motion.div>")
edit_template_str = block[edit_start:edit_end]

# We need to replace `index` with `actualIndex` in the template where necessary? 
# Wait, if we use a function `renderEditForm(field, index)` we can just pass them!

new_block = """                {subtasks.length > 0 || subtaskFields.length > 0 ? (
                  <div className="space-y-4">
                    {subtasks.map((task: any) => {
                      const editIndex = subtaskFields.findIndex(sf => sf.operTaskNo === task.taskNo);
                      if (editIndex !== -1) {
                        const field = subtaskFields[editIndex];
                        const index = editIndex;
                        return (
""" + edit_template_str.replace('\n', '\n                          ') + """
                        );
                      }
                      return (
                        <div key={task.taskNo} className="flex flex-col p-4 rounded-xl border bg-white border-slate-200 shadow-sm relative group hover:shadow-md hover:border-[#006699]/30 transition-all duration-300">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{task.code || `CP-${100 + task.taskNo}`}</span>
                              <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                                task.status === 'Done' || task.status === 'Complete' ? "bg-green-100/80 text-green-800" :
                                  task.status === 'In Progress' ? "bg-blue-100/80 text-blue-800" :
                                    task.status === 'In Review' ? "bg-purple-100/80 text-purple-800" :
                                      "bg-slate-200/80 text-slate-800"
                              )}>
                                {task.status}
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button type="button" size="sm" variant="outline" className="h-6 w-6 p-0 border-slate-300 text-slate-600 disabled:opacity-50" disabled={subtaskFields.length > 0} onClick={() => handleInlineEdit(task)} title="Inline Edit"><Edit2 size={12} /></Button>
                                <Button type="button" size="sm" variant="outline" className="h-6 w-6 p-0 border-slate-300 text-[#006699]" onClick={() => navigate(`/task/${task.taskNo}`)} title="Full Edit"><ExternalLink size={12} /></Button>
                                <Button type="button" size="sm" variant="outline" className="h-6 w-6 p-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => setSubtaskToDelete(task.taskNo)} title="Delete"><Trash2 size={12} /></Button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 border-t border-slate-100 pt-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Owner</span>
                              <span className="text-xs font-semibold text-slate-700">{task.assignedDisplayName || '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</span>
                              <span className="text-xs font-semibold text-slate-700">{task.endDate ? format(new Date(task.endDate), 'MMM dd, yyyy') : '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completion Date</span>
                              <span className="text-xs font-semibold text-slate-700">{task.completionDate ? format(new Date(task.completionDate), 'MMM dd, yyyy') : '-'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completion Remark</span>
                              <span className="text-xs font-semibold text-slate-700 truncate" title={task.completionRemark}>{task.completionRemark || '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {subtaskFields.map((field, index) => {
                      if (subtasks.some((st: any) => st.taskNo === field.operTaskNo)) return null;
                      return (
""" + edit_template_str.replace('\n', '\n                        ') + """
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No sub-tasks available</span>
                  </div>
                )}"""

content = content[:start_idx] + new_block + content[end_idx:]

with open('src/components/task/TaskForm.tsx', 'w') as f:
    f.write(content)

print("Done")
