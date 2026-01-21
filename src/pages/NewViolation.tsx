import { MainLayout } from '@/components/layout/MainLayout';
import { ViolationForm } from '@/components/violations/ViolationForm';

const NewViolation = () => {
  return (
    <MainLayout>
      <div className="animate-fade-in">
        <ViolationForm />
      </div>
    </MainLayout>
  );
};

export default NewViolation;
