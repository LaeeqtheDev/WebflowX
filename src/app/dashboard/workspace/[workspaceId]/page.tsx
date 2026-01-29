interface WorkspaceIdPageProps {
    params: Promise<{
      workspaceId: string;
    }>;
  }
  

const WorkspaceIdPage = async ({ params }: WorkspaceIdPageProps) => {
    const { workspaceId } = await params;
  
    return (
      <div>
        <h1>Workspace ID: {workspaceId}</h1>
      </div>
    );
  };
  
  export default WorkspaceIdPage;
  